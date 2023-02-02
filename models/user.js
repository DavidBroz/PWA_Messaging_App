const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const roomSchema = new mongoose.Schema({
	roomId: {
		type: String,
		required: true
	},
	readStatus: {
		type: Boolean,
		required: true
	},
});

const userSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	rooms: {
		type: [roomSchema],
		required: true,
		default: []
	},
	currentRoomId: {
		type: String,
		required: true,
		default: ""
	},

}, {timestamps: true});

const User = mongoose.model('User', userSchema);
module.exports = User;