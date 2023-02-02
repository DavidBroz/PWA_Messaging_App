const express = require('express');
const app = express();
const PORT = 3069 ;
const SOCKET_PORT = 4069;

const path = require('path');

const uri = "http://nejento.eu:"
//const uri = "http://localhost:"



//=================Database-setup=======================
const mongoose = require('mongoose');
const User = require('./models/user.js')
const Room = require('./models/room.js')
const dbURI='mongodb+srv://pwa_client:POiMGIDe0s1JpP1e@messagespwa.idfzyup.mongodb.net/PWAMessagingApp?retryWrites=true&w=majority';
mongoose.connect(dbURI, {useNewUrlParser: true, useUnifiedTopology: true})
	.then((result) => {
		console.log("Connection to database sucessful.");
		app.listen(
			PORT,
			()=>console.log(`Hello, I exist at ${PORT}`)
		);

	})
	.catch((err) => console.log(err));

//=================Socket.io-setup=======================
const io = require('socket.io')(SOCKET_PORT,{
	cors: {
		origin:[uri+PORT],
	},
});
io.on('connection', socket => {
	console.log("Socket connected: "+socket.id);
	socket.on("messange-sent", (sender, room, message) => process_message(sender,room,message));
});


//=================REST-SETUP=======================
app.use(express.json());
app.use(express.static(path.join(__dirname ,'public')));

app.set('views', path.join(__dirname ,'views'));
app.set('view engine', 'ejs');

//---------------Rendered-pages----------------------
app.get("",(req, res)=>{
	User.find()
		.then((result) => {
			res.render('index', {data: {
				"SOCKET_PORT":SOCKET_PORT,
				"allUsers":result
				}});
		})
		.catch((err) => console.log(err));	
});



app.get("/user/:id", async (req, res)=>{
	const { id } = req.params;

	const userObj = await User.findById(id);
	const currentRoom = await Room.findById(userObj["currentRoomId"]);

	let messageUserNames  = [];
	let allRoomNames = [];


	currentRoom.messages.forEach((message)=>{
		messageUserNames.push(message.senderId);
	});
	userObj.rooms.forEach((r)=>{
		allRoomNames.push(r.roomId);
	});

	const users = await User.find({ '_id': { $in: messageUserNames } });
	const rooms = await Room.find({ '_id': { $in: allRoomNames } });

	for(let i = 0; i<users.length;i++){
		messageUserNames = messageUserNames.map(e => e.replace(users[i]._id, users[i].name));
	}
	for(let i = 0; i<rooms.length;i++){
		allRoomNames = allRoomNames.map(e => e.replace(rooms[i]._id, rooms[i].name));
	}

	const allUsers = await User.find();
	
	res.render('user', {data: {
			"user":userObj,
			"currentRoom": currentRoom,
		 	"messageUserNames":messageUserNames, 
		 	"allUsers":allUsers,
		 	"allRoomNames":allRoomNames,
		 	"uri": uri,
		 	"SOCKET_PORT":SOCKET_PORT}});		
});
//----------------------------------------------

app.post("/user/add/:userName", async (req, res)=>{
	const { userName } = req.params;
	const room = new Room({
		name: userName+"\'s private room",
		users :[],
		messages:[]
	});
	await room.save();
	const user = new User({
		name: userName,
		rooms: [{ roomId: room["_id"], readStatus: false}],
		currentRoomId: room["_id"]
		});
	await user.save();

	room["users"].push({"userId":user["_id"], "readStatus":false})
	await room.save();
	io.emit("new-user-added", user["_id"]);
	res.status(200).send(user);
});

app.get("/user/:userId/get-room/:roomId", async (req, res)=>{
	const { roomId } = req.params;
	const { userId } = req.params;
	let u = await User.findById(userId);
	u.currentRoomId = roomId;
	await u.save();
	res.status(200).redirect("/user/"+userId);		
});



app.get("/test-add-empty-room",(req, res)=>{
	const room = new Room({
		name: "Tady se mluvi o psech",
		users :[],
		messages:[]
	});

	room.save().then((result) => res.send(result)).catch((err) => console.log(err));
});

//for testinf
app.get("/get-all-users",(req, res)=>{
	//User.findByID("insert id here");
	User.find().then((result) => res.send(result)).catch((err) => console.log(err));

});


app.get("/rooms/:id",(req, res)=>{
	const { id } = req.params;
	const { userId } = req.body;
	Room.findById(id).then((result)=>{
		res.status(200).send(result);
	}).catch((err)=>{
		res.status(400).send({message: "Requested room does not exist"})
	});		
});
app.post("/rooms/:roomId/add-user",(req, res)=>{
	const { roomId } = req.params;
	const { userId } = req.body;
	
	User.findById(userId).then((result)=>{

		result["rooms"].push({"roomId":roomId, "readStatus":false});
		result.save();

	}).catch((err)=>{
		res.status(400).send({message: "Requested room does not exist"})
	});
	Room.findById(roomId).then((result)=>{
		result["users"].push({"userId":userId, "readStatus":false});
		result.save();
		res.status(200).send(result);
	}).catch((err)=>{
		res.status(400).send({message: "Requested room does not exist"})
	});		
});



app.post("/rooms/:roomId/send-message", async (req, res)=>{
	const { roomId } = req.params;
	const { userId } = req.body;
	const { userMessage } = req.body;
	
	await process_message(userId,roomId,userMessage);
	res.status(200).redirect("/user/"+userId);		
});

async function process_message(userId,roomId,userMessage){
		console.log("Processing message...");
		const entry = {"senderId": userId, "message": userMessage}
		let result = await Room.findById(roomId);
		result["messages"].push(entry);
		await result.save();
		const u = await User.findById(userId);
		io.emit("message-recieved", roomId, u.name, userMessage);
}

app.post("/rooms/add-room", async (req, res)=>{
	const { roomName } = req.body;
	const { userIds } = req.body;
	if(roomName.length == 0){
		res.status(400).send({ message: "Content cannot be empty" });
		return;
	}
	console.log("Room name: "+roomName)
	const room = new Room({
		name: roomName,
		users : [],
		messages:[]
	});
	userIds.forEach( u => {
		room.users.push({"userId":u, "readStatus":false });
	});
	await room.save();

	let fetchedUsers = await User.find({ '_id': { $in: userIds } });

	fetchedUsers.forEach( async fu => {
		fu.rooms.push({"roomId":room._id, "readStatus":false});
		await fu.save();
	})
	io.emit("new-room-added", userIds);
	res.status(200).redirect('back');
});