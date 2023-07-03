import { model, Schema } from "mongoose";

export const Users = model("users", new Schema({
    fnm: String,
    lnm: String,
    mob: {
        type: String,
        validate: {
            validator: (v: string) => /\d{10}/.test(v),
            message: (props: any) => `${props.value} is not a valid phone number!`
        },
        required: [true, 'User phone number required']
    },
    pswd: String,
    gen: {
        type: String,
        enum: { values: ['M', 'F', 'O'], message: '{VALUE} is not supported' }
    },
    addr: [new Schema({
        ln1: String,
        ln2: String,
        ct: String,
        st: String,
        zip: {
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
