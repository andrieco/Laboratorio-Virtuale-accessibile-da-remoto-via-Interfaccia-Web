
const IP_Address = process.env.IP_ADDRESS;
const startPort = Number(process.env.START_PORT);
const fs = require("fs");
const virtualbox = require("./virtualbox");
const machines = require("../models/machines");
const nomiMacchine = process.env.LISTA_MACCHINE.split(",");
var ActiveConnection = [];
var Ports = [];
var MacchineAttive = [];

/* Questa funzione di inizializzazione si confronta con il database e per le porte disponibili [50, numero provvisorio],
 * controlla se sono utilizzabili da altre macchine o no.
 */
async function InitializePorts(){

	for(let i = 0; i < 50; i++)
		Ports[i] = 1;

	MacchineAttive.forEach((element) => {
		element.forEach(async (element) => {
			await machines.findByMachine(element.code)
				.then(async data => {
					if(await virtualbox.isrunning(element.code)) {
						let dati = {
							codice: element.code,
							timestamp: (new Date()).getTime(),
							used: 0
						};
						ActiveConnection.push(dati);

						Ports[(data - startPort)] = 0;
					}
					else{
						//Cancello la entry nel database
						await machines.findOneAndDelete({machine: element.code}, () => {})
						element.used = 0;
					}
				})
				.catch(async err => {
					if(err.name === "Inexistent"){				//Non esiste una entry nel database
						if(await virtualbox.isrunning(element.code)){
							//La macchina va spenta
							LiberaMacchina(element.code);
						}
						else{
							element.used = 0;
						}
					}
					else
						console.log("Errore ricerca nel database: ", err);
				})
		});
	});
}

function SvuotaCartella(path){

	let elements = fs.readdirSync(path);

	elements.forEach((element) => {
		let elementPath = `${path}/${element}`;
		if(fs.statSync(elementPath).isDirectory()){
			SvuotaCartella(elementPath);
			while(fs.readdirSync(elementPath).length !== 0){}		//Attendi che l'operazione sia avvenuta
			let err = fs.rmdirSync(elementPath);
			if (err)
				console.log("Errore cancellazione cartella: ", err);
		}
		else{
			fs.unlinkSync(elementPath);
		}
	});
}

function SvuotaCartelleCondivise(codice){

	let directoryPath = `${process.cwd()}/shared_folders/${codice}`;

	SvuotaCartella(`${directoryPath}_toGuest`);
	SvuotaCartella(`${directoryPath}_toHost`);
}

async function LiberaMacchina(codice){
	for(let i = 0; i < MacchineAttive.length; i++)
		for(let j = 0; j < MacchineAttive[i].length; j++)
			if(MacchineAttive[i][j].code === codice) {
				if(await virtualbox.isrunning(codice)){
					virtualbox.poweroff(codice);
					setTimeout(() => LiberaMacchina(codice), 10000);
				}
				else{
					await virtualbox.resetmachine(codice)
						.then(data => console.log(data))
						.catch(err => console.log("Errore reset della macchina: ", err))
					SvuotaCartelleCondivise(codice);
					MacchineAttive[i][j].used = 0;
				}
				return;
			}

	//return -1 per segnalare l'errore?
}

/* La seguente funzione serve a fare pulizia quando si decide di spegnere la macchina
 */
async function LiberaRisorse(codice){
	console.log("Cancellazione di " + codice)
	machines.findOneAndDelete({machine: codice}, function (err, docs) {
		if (err) {
			console.log(err)
		} else {
			console.log(docs)
			Ports[(docs.port - startPort)] = 1;								//Libero la porta usata dalla macchina
		}
	});
	LiberaMacchina(codice);
}

/* La seguente funzione viene iterata periodicamente e controlla che la macchina in questione sia stata usata da qualcuno.
 * Qualora la macchina non sia stata usata da un certo quantitativo di tempo rispetto all'ultima volta che è stata usata,
 * la funzione provvede a cancellare il documento dalla collection e a [spegnere/cancellare, dipende da come viene sviluppato il progetto] la macchina.
 */
async function PeriodicCheck(){

	for(let i = 0; i < ActiveConnection.length; i++){
		console.log(ActiveConnection[i])
		let codice = ActiveConnection[i].codice
		//Controllo che l'utente non abbia spento la macchina, in quel caso cancellare la entry nel database
		if(!await virtualbox.isrunning(codice)){
			LiberaRisorse(codice);
			ActiveConnection.splice(i, 1);
			i--;
		}
		else {
			await virtualbox.isused(codice)
				.then(data => {
					if (!data) {
						if (ActiveConnection[i].used === 0) {
							let time = (new Date).getTime() - ActiveConnection[i].timestamp;
							console.log("La macchina " + codice + " non è utilizzata da " + time + " ms");
							if (time > 300000) {
								//Se sono arrivato qui vuol dire che la macchina è inutilizzata da molto tempo e va spenta
								LiberaRisorse(codice);
								ActiveConnection.splice(i, 1);
								i--;										//Decremento i perché ho cancellato un elemento dall'array
							}
						} else {
							ActiveConnection[i].timestamp = (new Date).getTime();
							ActiveConnection[i].used = 0;
						}
					} else {
						ActiveConnection[i].used = 1;
					}
				})
				.catch(err => console.log("Errore controllo stato della macchina: ", err))
		}
	}
}

/* Funzione usata per avviare la macchina virtuale con tutte le impostazioni necessarie
 */
async function AvviaMacchina(codice, utente){

	let port = null;

	for(let i = 0; i < Ports.length; i++)
		if(Ports[i] === 1){
			Ports[i] = 0;
			port = startPort + i;
			break;
		}

	if(!port)				//Abbiamo usato tutte le porte disponibili
		return -1;

	await virtualbox.start(codice)
		.then(output => console.log(output))
		.catch(err => console.log("Errore avvio macchina virtuale: ", err))		//Liberare la macchina

	virtualbox.changelisteningport(codice, port)
		.then(output => console.log(output))
		.catch(err => console.log("Errore cambio porta di ascolto: ", err));								//Liberare la macchina

	let macchina = new machines({"port": port, "machine": codice, "user": utente});
	await macchina.save();

	//Aggiorna ActiveConnections
	let dati = {
		codice: 	macchina.machine,
		timestamp:	(new Date()).getTime(),
		used: 		0
	};
	ActiveConnection.push(dati);

	return {
		port: port,
		code: macchina.machine
	};
}

class vmHandler {

	constructor() {

		virtualbox.list()
			.then(data => console.log(data))
			.catch(err => console.log("Errore lettura lista delle macchine virtuali: ", err))

		virtualbox.availablemachines(nomiMacchine)
			.then(data => {
				MacchineAttive = data;
				InitializePorts();
			})
			.catch(err => console.log("Errore controllo delle macchine virtuali disponibili: ", err))

		setInterval(PeriodicCheck, 15000);
	}

	List(index){
		let number = 0;
		for(let i = 0; i < MacchineAttive[index].length; i++)
			if(!MacchineAttive[index][i].used)
				number++;
		return number;
	}

	TrovaCodice(index){
		for(let i = 0; i < MacchineAttive[index].length; i++)
			if(!MacchineAttive[index][i].used){
				MacchineAttive[index][i].used = 1;
				return MacchineAttive[index][i];
			}
		return 0;			//Indica che non ci sono macchine disponibili
	}

	/* Funzione che controlla se c'è già una macchina del tipo richiesto associata all'utente.
 	 */
	async CheckUser(index, utente){

		let macchine = await machines.findByUser(utente);
		for(let i = 0; i < macchine.length; i++){
			for(let j = 0; j < MacchineAttive[index].length; j++)
				if (MacchineAttive[index][j].code === macchine[i].machine){
					return {
						port: macchine[i].port,
						code: macchine[i].machine
					};
				}
		}
		return null;
	}

	async Reserve(index, user) {

		let machine;

		machine = await this.CheckUser(index, user);
		if(machine === null) {							//Se non esiste una macchina già aperta associata a quell'utente
														//si procede ad avviarne una.
			let macchina = this.TrovaCodice(index);
			let codice = macchina.code;

			if (!codice)
				return 0;

			machine = await AvviaMacchina(codice, user);
			if(machine === -1)
				return -1;
		}

		return {
			IP: `${IP_Address}:${machine.port}`,
			code: machine.code
		};
	}

	async Clone(index, utente){

		console.log("Nome della Macchina virtuale clone: ", virtualbox.generateclonename(nomiMacchine[index], MacchineAttive[index].length));
		return await virtualbox.clone(nomiMacchine[index], MacchineAttive[index].length)			//Guardo la dimensione dell'array per capire che numero dare alla macchina
			.then(async nome => {
				//Inizializzazione della macchina
				return await virtualbox.findcode(nome)
					.then(async code => {

						let machine = {
							code: code,
							used: 1
						};
						MacchineAttive[index].push(machine);

						fs.mkdirSync(`${process.cwd()}/shared_folders/${code}_toGuest`);
						fs.mkdirSync(`${process.cwd()}/shared_folders/${code}_toHost`);
						await virtualbox.sharedfolders(code)
							.catch(err => console.log("Errore impostazione cartelle condivise: ", err))

						await virtualbox.generatesnapshot(code)
							.then(data => console.log(data))
							.catch(err => console.log("Errore generazione dello snapshot del clone: ", err))

						await virtualbox.changeauthtype(code)
							.catch(err => console.log("Errore cambio autenticazione: ", err))

						let data = await AvviaMacchina(code, utente);

						return {
							IP: `${IP_Address}:${data.port}`,
							code: data.code
						};
					})
					.catch(err => {
						console.log("Errore ricerca della macchina virtuale", err);
						return -1;
					})
			})
			.catch(err =>  {
				console.log("Errore clonazione macchina virtuale: ", err);
				return -1;
			})
	}

}

module.exports = vmHandler;
