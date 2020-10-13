
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = mongoose.Schema({
	username: {
		type: String,
		required: true,
		trim: true,
		unique: true
	},
	password: {
		type: String,
		required: true,
		minLength: 8
	},
	tokens: [{
		token: {
			type: String,
			required: true
		}
	}]
});

userSchema.pre("save", async function(next){
	//Criptazione della password
	const user = this;
	if(user.isModified("password"))
		user.password = await bcrypt.hash(user.password, 8)
	next();
});

userSchema.methods.generateAuthToken = async function(){
	//Genera il token di autenticazione per l'utente
	const user = this;
	const token = jwt.sign({_id: user._id}, process.env.JWT_KEY);
	user.tokens.push({token});
	await user.save();
	return token;
};

userSchema.statics.findByCredentials = async (username, password) => {
	// Search for a user by username and password.
	const user = await User.findOne({username})
	if (!user) {
		throw new Error("Invalid login credentials");
	}
	const isPasswordMatch = await bcrypt.compare(password, user.password);
	if(!isPasswordMatch) {
		throw new Error("Invalid login credentials");
	}
	return user;
}

const User = mongoose.model("User", userSchema);

module.exports = User;
