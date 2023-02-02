const sendButton = document.getElementById("sendButton");
const userMessage = document.getElementById("userMessage");
const userId = document.getElementById("userId");
const roomId = document.getElementById("roomId");
const form = document.getElementById("form");

form.addEventListener("submit", e => {
	e.preventDefault();
	const message = userMessage.value;
	const sender = userId.value;
	const room = roomId.value;

	const data = { "userId": sender ,"userMessage": message, "roomId":room}
	console.log(data);
});