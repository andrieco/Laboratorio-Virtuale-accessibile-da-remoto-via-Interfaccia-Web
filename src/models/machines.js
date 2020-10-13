
const mongoose = require("mongoose");

const machinesSchema = mongoose.Schema({
	port: {
		type: Number,
		required: true,
		unique: true
	},
	machine: {
		type: String,
		required: true,
		unique: true
	},
	user: {
		type: String,
		required:true
	}
});

machinesSchema.statics.findByPort = async function (port){
	let machine = await machines.findOne({port});
	if(!machine)
		throw {name: "Inexistent", message: "Non esiste una macchina associata a quella porta"};
	return machine.machine;
}

machinesSchema.statics.findByMachine = async function (id){
	let machine = await machines.findOne({machine: id});
	if(!machine)
		throw {name: "Inexistent", message: "Non esiste una porta associata a quella macchina"};
	return machine.port;
}

machinesSchema.statics.findByUser = async function (user) {
	let machine = await machines.find({user: user});
	if(!machine)
		throw {name: "Inexistent", message: "Non esistono macchine associate a quell'utente"};
	return machine;
}

const machines = mongoose.model("machines", machinesSchema);

module.exports = machines;
