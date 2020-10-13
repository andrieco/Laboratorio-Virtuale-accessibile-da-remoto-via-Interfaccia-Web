
const applicationID = window.location.hash.replace("#", "");
var codice;

function OttieniNumero(){
	fetch(`/connect/info?index=${applicationID}`)
		.then(res => {
			if(res.ok)
				res.json()
					.then(data => $('#Numero').text(data.number))
			else{
				console.log("Errore")
			}
		})
		.catch(err => console.log(err))
}

function OttieniMacchina(){
	fetch(`/connect/machine?index=${applicationID}`)
		.then(res => {
			console.log(res)
			if(res.ok)
				if(res.status === 200) {						//Vuol dire che c'è una macchina già avviata
					res.json()
						.then(data => {
							$('#ipAddress').text(data.IP);
							$('#password').text(data.password);
							codice = data.code;
							$('#panel').transition('slide down');
							$('#Bottone').empty();
							$('#Bottone').addClass("disabled");
							$('#Bottone').append("Ottieni i dati per la Connessione");
						})
				}
		})
}

$(document).ready(function () {

	OttieniNumero();
	OttieniMacchina();

	$('.ui.dropdown').dropdown();

	switch(Number(applicationID)){
		case(1):
			$('#descrizione').append(
				'<p><h3>Compilatore GCC:</h3>' +
				'Questa macchina virtuale è utile per usare il compilatore gcc. Una volta collegati, ' +
				'si può decidere se caricare dei file tramite l\'apposito pulsante per poi trovarli nella cartella "Host" della macchina ' +
				'virtuale o se usare un\'applicazione di testo per scrivere il file da compilare. Una volta finito, se si desidera ' +
				'scaricare quanto fatto, si inseriscano i file nella cartella "Guest" e successivamente si prema il tasto  apposito ' +
				'per fare il download dei file.</p>'
			);
			break;
		default:

	}

	$('#Indietro').click(function () {
		window.location.href = "/main";
	});

	$('#ricarica').click(OttieniNumero);

	let Bottone = $('#Bottone');
	Bottone.click(function () {
		Bottone.addClass("disabled")
		Bottone.empty();
		Bottone.append("<div class='inline ui active tiny loader'></div> Attendere mentre la macchina viene avviata");
		fetch(`/connect/getdata?index=${applicationID}`)
			.then(res => {
				if(res.ok) {
					if (res.status === 202) {						//Non ci sono macchine disponibili, prompt per la clonazione
						Bottone.empty();
						Bottone.append("Nessuna macchina virtuale disponibile al momento")
						$('#fondo').append(
							'<div id="cloning">\n' +
								'<hr>\n' +
								'<p>Al momento non sono disponibili delle macchine virtuali già pronte, tuttavia il sistema può crearne una, il processo ' +
								'però richiederà un po\' di tempo (indicativamente qualche minuto). Vuoi procedere?</p>\n'+
								'<div class="ui grid">\n'+
									'<div class="eight wide column">\n' +
										'<button id="Positive" class="positive fluid ui button">Sì</button>\n' +
									'</div> \n' +
									'<div class="eight wide column">\n' +
										'<button id="BottoneIndietro" class="negative fluid ui button">No, portami al menù</button>\n' +
									'</div> \n' +
								'</div>\n' +
							'</div>');
						$('#BottoneIndietro').click(function () {
							window.location.href = "/main";
						});
						$('#Positive').click(function() {
							$('#Positive').addClass("loading disabled");
							fetch(`/connect/clone?index=${applicationID}`)
								.then(res => {
									if(res.ok)
										res.json()
											.then(data => {
												$('#cloning').remove();
												$('#ipAddress').text(data.IP);
												$('#password').text(data.password);
												codice = data.code;
												$('#panel').transition('slide down');
												Bottone.empty();
												Bottone.append("Ottieni i dati per la Connessione");
											})
									else{
										console.log("NON OK")
									}
								})
								.catch(err => console.log(err))
						})
					}
					else if(res.status === 220){
						Bottone.empty();
						Bottone.removeClass("green");
						Bottone.addClass("red");
						Bottone.append("<i class='inline ui close icon'></i> Spiacenti, nessuna macchina è disponibile. Vi invitiamo a riprovare più tardi");
					}
					else {
						console.log(res)
						res.json()
							.then(data => {
								$('#ipAddress').text(data.IP);
								$('#password').text(data.password);
								codice = data.code;
								$('#panel').transition('slide down');
								Bottone.empty();
								Bottone.append("Ottieni i dati per la Connessione");
							})
					}
				}
				else{
					console.log("C'è stato un errore");
				}
			})
			.catch(err => console.log(err))

	});

	$('#Logout').click(function () {
		fetch("/user/logout", {
			method: "POST",
			redirect: "follow"
		})
			.then(response => {
				if(response.ok)
					window.location.href = "/login";
				else
					console.log(response);
			})
			.catch(err => console.log(err))
	});

	$('#inviaFile').click(function () {

		var formData = new FormData();
		const fileField = document.querySelector('input[type="file"][multiple]');

		for(let i = 0; i < fileField.files.length; i++)
			formData.append('file', fileField.files[i]);


		fetch(`/connect/sendFile?code=${codice}`, {
			method: "POST",
			body: formData,
			redirect: "follow"
		})
			.then(response => {
				if(response.status === 200)
					alert("Caricamento avvenuto con successo");
				response.text()
			})
			.then(result => console.log(result))
			.catch(error => console.log('error', error));
	});

	$('#ottieniFile').click(function() {

		fetch(`/connect/getFile?code=${codice}`)
			.then(res => {
				if(res.ok){
					if(res.status === 220)				//Non c'è nessun file nella cartella richiesta
						alert("Attenzione, nessun file è presente nella cartella richiesta. Inserirne e riprovare.")
					else{
						res.blob()
							.then(blob => saveAs(blob, "download.zip"))
					}
				}
			})
			.catch(err => console.log(err))
	});
});
