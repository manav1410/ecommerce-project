import { model, Schema } from "mongoose";

export const Users = model("users", new Schema({
    firstname: String,
    lastname: String,
    email: {
        type: String,
        lowercase: true,
        unique: true,
        required: true,
        validator: (v: string) => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v),
        message: (props: any) => `${props.value} is not a valid Email!`
    },
    password: String,
    gender: {
        type: String,
        enum: { values: ['M', 'F', 'O'], message: '{VALUE} is not supported' }
    },
    address: [new Schema({
        addressline1: String,
        addressline2: String,
        city: String,
        state: String,
        zipcode: {
            validator: (v: string) => /\d{6}/.test(v),
            message: (props: any) => `${props.value} is not a valid Pin Code!`
        },
    })]
}));

export const Products = model("products", new Schema({
    name: String
}));

export const Orders = model("orders", new Schema({

}));

export const Cart = model("cart", new Schema({

}));

export const OtpRequests = model("otp_requests", new Schema({

}));

export const UserProductEngagement = model("user_product_engagement", new Schema({

}));
