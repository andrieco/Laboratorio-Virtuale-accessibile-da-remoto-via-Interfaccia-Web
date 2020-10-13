
const express = require("express");
const formidable = require("formidable");
const fs = require("fs");
const ejs = require("ejs");
const child_process = require("child_process");
const app = express();
const vmManager = require("../managers/vm_manager");
const auth = require("../middleware/auth");
const IP_Address = process.env.IP_ADDRESS;
var vmHandler = new vmManager();

app.get("/main", auth, (req,res) => {
	ejs.renderFile(`${process.cwd()}/site/main/main.ejs`, {utente: req.user.username})
	.then(data => res.status(200).send(data))
	.catch(err => {
		console.log(err);
		res.sendStatus(500);
	})
});

app.get("/connect", auth, (req,res) => {
	ejs.renderFile(`${process.cwd()}/site/connect/connect.ejs`, {utente: req.user.username})
		.then(data => res.status(200).send(data))
		.catch(err => {
			console.log(err);
			res.sendStatus(500);
		})
});

app.get("/faq", (req,res) => {
	res.sendFile(process.cwd() + "/site/faq/faq.html");
})

app.get("/connect/info", (req,res) => {
	let data = {
		number: vmHandler.List(req.query.index - 1)
	}
	res.status(200).send(data);
});

app.get("/connect/machine", auth, async (req,res) => {
	let data = await vmHandler.CheckUser(req.query.index - 1, req.user.username);

	if(data){
		res.status(200).send({
			IP: `${IP_Address}:${data.port}`,
			password: "virtual.lab",
			code: data.code
		});
	}
	else
		res.sendStatus(204);
});

app.get("/connect/getdata", auth, async (req,res) => {

	await vmHandler.Reserve(req.query.index - 1, req.user.username)
		.then(data => {
			if(data === 0) {				//Non ci sono macchine disponibili
				res.sendStatus(202);
			}
			else if(data === -1){				//La macchina non è riuscita ad avviarsi
				res.sendStatus(220);
			}
			else{
				let info = {
					IP: data.IP,
					password: "virtual.lab",
					code: data.code
				}
				res.status(200).send(info);
			}
		})
		.catch(err => {
			console.log(err)
			res.status(500).send(err);
		})
});

app.get("/connect/clone", auth, async (req,res) => {

	if(vmHandler.List(req.query.index - 1) !== 0){
		res.sendStatus(400);				//Vuol dire che qualcuno ha mandato una richiesta e ci sono delle macchine libere
	}
	else{

		let data = await vmHandler.Clone(req.query.index - 1, req.user.username);

		if(data === -1)					//C'è stato un errore
			res.sendStatus(500);
		else{
			console.log(data)
			let info = {
				IP: data.IP,
				password: "virtual.lab",
				code: data.code
			}

			res.status(200).send(info);
		}
	}
});

app.post("/connect/sendFile", auth, (req,res) => {
	new formidable.IncomingForm().parse(req)
		.on("fileBegin", (name, file) => {
			file.path = `${process.cwd()}/shared_folders/${req.query.code}_toGuest/${file.name}`;
		})
		.on("file", (name, file) => {
			console.log("Uploaded file", name/*, file*/);
		})

	res.sendStatus(200);
});

app.get("/connect/getFile", (req,res) => {

	let directoryPath = `${process.cwd()}/shared_folders/${req.query.code}_toHost/`;

	if(fs.readdirSync(directoryPath).length > 0){				//Preparo i file solo se la cartella non è vuota

		child_process.execSync(`zip -r download.zip *`, {
			cwd: `${directoryPath}`
		});

		res.download(`${directoryPath}/download.zip`, function () {
			fs.unlink(`${directoryPath}/download.zip`, () => {});
		});
	}
	else{
		res.sendStatus(220);			//Mando uno stato particolare per far capire al client che non ci sono file
	}
});

module.exports = app;
