const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const roomUser = new mongoose.Schema({
	userId: {
		type: String,
		required: true
	},
	readStatus: {
		type: Boolean,
		required: true
	},
});

const roomMessage = new mongoose.Schema({
	senderId: {
		type: String,
		required: true
	},
	message: {
		type: String,
		required: true
	},
}, {timestamps: true});

const roomSchema = new Schema({
	name: {
		type: String,
		required: true
	},
	users: {
		type: [roomUser],
		required: true,
		default: []
	},
	messages: {
		type: [roomMessage],
		required: true,
		default: []
	},

}, {timestamps: true});

const Room = mongoose.model('Room', roomSchema);
module.exports = Room;