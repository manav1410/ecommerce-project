import express from "express";
import Joi from "joi";
import { Schema } from "../library/joi_schemas";
import { validateRequest } from "../library/validations";

const router = express.Router();

router.post('/', loginSchema, login);
router.post('/send_otp', sendOtpSchema, sendOtp);
router.post('/signup', signupSchema, signup);

function loginSchema(req: any, res: any, next: any) {
    let schema = Joi.object({
        mobile: Schema.mobile.label("Mobile").required(),
        password: Schema.string.label("Password").required(),
        login_method: Schema.string.valid("password", "otp")
    });

    validateRequest(req, res, next, schema);
}

async function login(req: any, res: any, next: any) {

}

function sendOtpSchema(req: any, res: any, next: any) {
    let schema = Joi.object({
        mobile: Schema.mobile.label("Mobile").required(),
    });

    validateRequest(req, res, next, schema);
}

async function sendOtp(req: any, res: any, next: any) {

}

function signupSchema(req: any, res: any, next: any) {
    let schema = Joi.object({
        
        mobile: Schema.mobile.label("Mobile").required(),
        password: Schema.string.label("Password").required(),
        login_method: Schema.string.valid("password", "otp")
    });

}

async function signup(req: any, res: any, next: any) {

}


 
module.exports = router;

