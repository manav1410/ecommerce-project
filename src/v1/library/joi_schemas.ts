import Joi from "joi";

const joiString = Joi.string().trim().replace(/"/, "")

export const Schema = {
    integer: Joi.number().integer(),
    string: joiString,
    mobile: joiString.length(10).pattern(/^[0-9]{10}$/).message("Please enter valid mobile"),
    password: joiString.min(5).max(13).pattern(/^[a-zA-Z0-9@!#%&]/).message("Only Alphabets, Numbers and @!#%& are allowed in the Password"),

}