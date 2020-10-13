
const express = require("express");
const app = express();
const user = require("../models/user");
const auth = require("../middleware/auth");
const autologin_auth = require("../middleware/autologin_auth");

function Check(username, password){

    let cond_a = username.length < 4;
    let cond_b = password.length < 8;
    let cond_c = UserCheck(username);

    if(cond_a || cond_b || cond_c)
        return true;

    return false;
}

function UserCheck(username){

    if(!username.match(/[a-zA-Z0-9]/) 	||	//Deve esserci almeno un carattere alfanumerico
        username.match(/  /)			||	//Non possono esserci due spazi vicini
        username.match(/ $/)			||	//Non può esserci uno spazio alla fine
        username.match(/^ /)			)	//Non può esserci uno spazio all'inizio
        return true;
    return false;
}

app.get("/", autologin_auth, (req,res) => {
    if(req.user)
        res.redirect(302, "/main");
    else
        res.redirect(302, "/login");
});

app.get("/login", (req,res) => {
    res.sendFile(process.cwd() + "/site/login/login.html");
});

app.get("/register", (req,res) => {
    res.sendFile(process.cwd() + "/site/register/register.html");
});

app.post("/user/register", async(req,res) => {
    //Creazione di un nuovo utente
    try{
        if(Check(req.body.username, req.body.password))                           //Check degli input
            throw {name:"Invalid credentials", message:"Credenziali invalide"}
        let utente = new user(req.body);
        await utente.save();
        const token = await utente.generateAuthToken();
        res.status(201).cookie("JWT", token).send({utente, token});
    } catch (err) {
        if(err.name === "MongoError")
            return res.status(420).send({error: "Username già usato"});
        res.status(400).send(JSON.stringify(err));
    }
});

app.post("/user/login", async(req,res) => {
    try{
        const {username, password} = req.body;
        let utente = await user.findByCredentials(username, password);
        let token;
        if(utente.tokens.length)
            token = utente.tokens[0].token
        else
            token = await utente.generateAuthToken();
        res.status(200).cookie("JWT", token).send({utente, token});
    } catch (err) {
        if(err.name === "MongoError")
            return res.status(401).send({error: "Login fallito! Controlla i dati inseriti"});
        console.log(err)
        res.status(400).send(err);
    }
});

app.post("/user/logout", auth, async (req,res) => {
    try{
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });
        await req.user.save();
        res.clearCookie("JWT").redirect(302, "/login");
    } catch (error) {
        res.status(500).send(error);
    }
});

module.exports = app;