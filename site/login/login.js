

function InviaInformazioni() {

    const error = $('#errore');

    error.hide();
    error.empty();
    let username = $('#username').val();
    let password = $('#password').val();

    //Check degli input
    if(Check(username, password)){
        $('.form').addClass("loading");
        $('#Invia').addClass("loading");

        fetch("/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "username": username,
                "password": password
            })
        })
            .then(res => {
                if(res.ok)
                    window.location.href = "/main";
                //console.log("OK")
                else {
                    $('.form').removeClass("loading");
                    $('#Invia').removeClass("loading");
                    error.append("<p>Dati inseriti non corretti</p>");
                    error.show();
                }
            })
            .catch(err => console.log(err))
    }
}

function Check(username, password) {

    const error = $('#errore');

    let cond_a = username.length < 4;
    let cond_b = password.length < 8;

    if(cond_a || cond_b){
        if(cond_a)
            error.append("<p>Username troppo corto</p>");
        if(cond_b)
            error.append("<p>Password troppo corta</p>");

        $('#errore').show();
        return 0;
    }
    return 1;
}

$(document).ready(function() {

    $(document).on('keypress',function(e) {
        if(e.key === "Enter") {
            $('#Invia').click();
        }
    });

    $("#Invia").click(() => {
        InviaInformazioni();
    });
});
