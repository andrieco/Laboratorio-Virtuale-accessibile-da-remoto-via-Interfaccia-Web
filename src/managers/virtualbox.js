
const execFile = require("child_process").execFile;
const VBoxManagePath = (process.env.VBOX_INSTALL_PATH || process.env.VBOX_MSI_INSTALL_PATH) + 'VBoxManage.exe';
const Desktop_Path = process.env.PERCORSO_DESKTOP;

function list() {

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["list", "vms"], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	});
}

function findcode(name){

	return new Promise((resolve, reject) => {
		list(name)
			.then(data => {
				let machines = data.split("\n");
				for (let i = 0; i < machines.length; i++)
					if (machines[i].includes(`"${name}"`))
						resolve(machines[i].substring(machines[i].lastIndexOf('{') + 1, machines[i].length - 2));
				resolve(0);
			})
			.catch(err => reject(err))
	});
}

/* La funzione riceve due nomi, il nome della macchina e il nome della macchina di riferimento e ci dice se il nome
 * che gli abbiamo inviato è quello di un clone della macchina di riferimento (in base al criteri con cui scegliamo
 * i nomi delle macchine)
 */
function isclone(nome, riferimento){
	//In questo caso il nome dei cloni è del tipo "{nome della macchina di riferimento}_{numero del clone}"
	return nome.includes(riferimento + "_");
}

function generateclonename(riferimento, numero){

	return `${riferimento}_${numero}`;
}

function availablemachines(nomi){

	return new Promise((resolve, reject) => {
		list()
			.then(data => {
				let codes = [];								//Array che contiene i codici dei vari cloni
				for(let i = 0; i < nomi.length; i++)		//Lo inizializzo inserendo un array vuoto per ogni tool
					codes.push([]);							//disponibile nel server
				let machines = data.split("\n");
				for(let i = 0; i < machines.length; i++){
					if(machines[i].length !== 0) {					//Escludo l'ultima riga vuota
						let start = machines[i].lastIndexOf('{');
						let code = machines[i].substring(start + 1, machines[i].length - 2);
						for(let j = 0; j < nomi.length; j++)
							if(isclone(machines[i], nomi[j])){
								let data = {
									code: code,
									used: 1
								}
								codes[j].push(data);
							}
					}
				}
				resolve(codes);
			})
			.catch(err => reject(err))
	});
}

function generatesnapshot(nome){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["snapshot", nome, "take", "InitalState", "--description", "\"Stato iniziale della macchina\""], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	})
}

function resetmachine(nome){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["snapshot", nome, "restorecurrent"], function(error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		})
	})
}

function start(name){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["-nologo", "startvm", name, "--type", "headless"], function (error,stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	});
}

function info(name){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["showvminfo", name, "-machinereadable"], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout.split('\n'));
		});
	});
}

function isrunning(name){

	return new Promise((resolve, reject) => {
		info(name)
			.then(data => {
				for(let i = 0; i < data.length; i++) {
					if(data[i].lastIndexOf("VMState") !== -1){
						resolve(data[i][9] === 'r');
						break;
					}
				}
			})
			.catch(err => reject(err))
	});
}

function isused(name){				//Da migliorare, probabilmente

	return new Promise((resolve, reject) => {
		info(name)
			.then(data => {
				for(let i = 0; i < data.length; i++){
					if(data[i].lastIndexOf("VRDEActiveConnection") !== -1){
						resolve(data[i][23] === 'n');
						return;
					}
				}
			})
			.catch(err => reject(err))
	});
}

function poweroff(name){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["controlvm", name, "acpipowerbutton"], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	});
}

function clone(nome, clone_number){

	console.log("Clonazione della macchina " + nome + " iniziata");

	return new Promise((resolve, reject) => {
		let nomeClone = generateclonename(nome, clone_number);
		execFile(VBoxManagePath, ["clonevm", nome, "--name", nomeClone, "--register"], function (error, stdout) {
			if(error) reject(error);
			else {
				console.log("Clonazione della macchina " + nome + " completata");
				resolve(nomeClone);
			}
		});
	});
}

function changelisteningport(name, port){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["controlvm", name, "vrde", "on"], function (error, stdout) {
			if(error) reject(error);
		});
		execFile(VBoxManagePath, ["controlvm", name, "vrdeport", port], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	});
}

function changeauthtype(name){

	return new Promise((resolve, reject) => {
		execFile(VBoxManagePath, ["modifyvm", name, "--vrdeauthtype", "null"], function (error, stdout) {
			if(error) reject(error);
			else resolve(stdout);
		});
	});
}

function sharedfolders(codice){

	return new Promise((resolve, reject) => {

		execFile(VBoxManagePath, ["sharedfolder", "add", codice, "--name", "Upload", "--hostpath", `${process.cwd()}/shared_folders/${codice}_toGuest`, "--readonly", "--automount", "--auto-mount-point", `${Desktop_Path}/Host`], function (error, stdout) {
			if(error) reject(error);
			else
				execFile(VBoxManagePath, ["sharedfolder", "add", codice, "--name", "Download", "--hostpath", `${process.cwd()}/shared_folders/${codice}_toHost`, "--automount", "--auto-mount-point", `${Desktop_Path}/Guest`], function (error, stdout) {
					if(error) reject(error);
					else resolve(stdout);
				});
		});
	});
}

module.exports = {
	'list': 				list,
	'findcode':				findcode,
	'isclone':				isclone,
	'generateclonename':	generateclonename,
	'availablemachines':	availablemachines,
	'generatesnapshot':		generatesnapshot,
	'resetmachine': 		resetmachine,
	'start': 				start,
	'info': 				info,
	'isrunning': 			isrunning,
	'isused': 				isused,
	'poweroff': 			poweroff,
	'clone':				clone,
	'changelisteningport': 	changelisteningport,
	'changeauthtype':		changeauthtype,
	'sharedfolders':		sharedfolders
};
