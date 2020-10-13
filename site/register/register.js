
function Check(username, password, repassword){

	let cond_a = username.length < 4;
	let cond_b = password.length < 8;
	let cond_c = password !== repassword;
	let cond_d = UserCheck(username);

	if(cond_a || cond_b || cond_c || cond_d){

		let err = $('#errore');

		if(cond_a)
			err.append("<p>Username troppo corto (Minimo 4 caratteri)</p>");
		if(cond_b)
			err.append("<p>Password troppo corta (Minimo 8 caratteri)</p>");
		if(cond_c)
			err.append("<p>Le due password non coincidono</p>");
		if(cond_d)
			err.append("<p>L'username non rispetta le regole</p>");

		err.show();
		return false;
	}

	return true;
}

function UserCheck(username){

	if(!username.match(/[a-zA-Z0-9]/) 	||	//Deve esserci almeno un carattere alfanumerico
	    username.match(/  /)			||	//Non possono esserci due spazi vicini
		username.match(/ $/)			||	//Non può esserci uno spazio alla fine
		username.match(/^ /)			)	//Non può esserci uno spazio all'inizio
		return true;
	return false;
}

$(document).ready(function () {

	$(document).on('keypress',function(e) {
		if(e.key === "Enter") {
			$('#Invia').click();
		}
	});

	$('.popup').popup();

	$('#Indietro').click(function () {
		window.location.href = "/login";
	})

	$('#Invia').click(function () {

		let err = $('#errore');

		err.hide();
		err.empty();

		let username = $('#username').val();
		let password = $('#password').val();
		let repassword = $('#repassword').val();

		if(Check(username, password, repassword)){

			fetch("/user/register", {
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				body: JSON.stringify({
					username: username,
					password: password
				})
			})
				.then(res => {
					if(res.ok)
						window.location.href = "/main";
					else
						if(res.status === 420)
							window.alert("Username già in uso, riprovare")
						res.json()
							.then(data => console.log(data))
				})
				.catch(err => console.log(err))
		}
	})
});