
const jwt = require("jsonwebtoken");
const user = require("../models/user");

const autologin_auth = async (req, res, next) => {
	const token = req.cookies["JWT"];
	req.user = null;
	if(token){
		const data = jwt.verify(token, process.env["JWT_KEY"]);
		let utente = await user.findOne({_id: data._id, "tokens.token": token});
		if(utente){
			req.user = utente;
			req.token = token;
		}
	}
	next();
}

module.exports = autologin_auth;
