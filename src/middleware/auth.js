
const jwt = require("jsonwebtoken");
const user = require("../models/user");

const auth = async (req, res, next) => {
	const token = req.cookies["JWT"];
	try {
		const data = jwt.verify(token, process.env.JWT_KEY);
		const utente = await user.findOne({_id: data._id, "tokens.token": token});
		if(!utente) {
			throw new Error();
		}
		req.user = utente;
		req.token = token;
		next();
	} catch (error) {
		res.status(401).sendFile(process.cwd() + "/site/logout/logout.html");
	}
};

module.exports = auth;
