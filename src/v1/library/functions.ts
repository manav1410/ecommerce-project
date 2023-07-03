import crypto from "crypto";
import cryptoJs from "crypto-js";
import dateFormat from 'dateformat';
import fs from "fs";
import ini from "ini";
import lodash_round from "lodash/round";
import path from "path";
import querystring from 'querystring';
import request from 'request';
import { config } from "../config";
import { constants } from '../constants';
import { dbapi_clients_tokens } from "../model/dbapi_clients_tokens";
import { dbchemist_device_users } from "../model/dbchemist_device_users";
import { dberror_logs } from "../model/dberror_logs";
import { dbmessage_templates } from "../model/dbmessage_templates";
import { dbnotifications } from "../model/dbnotifications";
import {dbsetting_values} from "../model/dbsetting_values";

let ENVIRONMENT: any = process.env.APP_ENV || 'localhost';

/* Initialization for Android Push Notifications */
var admin = require("firebase-admin");
var serviceAccount = require("./patientServiceAccountKey.json");

// Initialize the default app
var chemist = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://evital-android-app.firebaseio.com"
});

export class functions {
    static static_languagevars: any = {};
    public languagevars: any = {};
    protected language: string = '';

    constructor() {
        this.languagevars = {};
        this.language = '';
        /* Get Language Data */
        this.language = 'english';
        this.languagevars = this.getLanguageData();
    }

    /**
     * Get language.ini variable to available in whole app
     */
    getLanguageData() {
        if (Object.keys(functions.static_languagevars).length == 0) {
            let languageArray = ini.parse(fs.readFileSync(path.join(__dirname, '../../../', 'language.ini'), 'utf-8'));
            functions.static_languagevars = languageArray[this.language];
        }
        return functions.static_languagevars;
    }

    /**
     * Function to convert date in Long date format
     * @param date Date
     * @param showtime if want to show time or not
     * @returns date in format of "02 Aug 2019" or "02 Aug 2019 12:47 PM"
     */
    DatabaseToDisplayDateLong(date: string, showtime = false) {
        if (showtime) {
            return dateFormat(date, 'dd mmm yyyy h:MM TT');
        } else {
            return dateFormat(date, 'dd mmm yyyy');
        }
    }

    /**
     * Function to change date in current format i.e today, yesterday and date then after
     * @param date date
     * @param fullyear if want to show fullyear or not
     * @returns date in format of "today" or "yesterday" or "02 Aug 2019" or "02 Aug '19"
     */
    DatabaseToDisplayDateCurrent(date: string, fullyear: boolean = false) {
        date = dateFormat(date, 'dd mmm yyyy');
        let today_date: string = dateFormat(new Date(), 'dd mmm yyyy');
        let yesterday_date: string = dateFormat(new Date().setDate(new Date().getDate() - 1), 'dd mmm yyyy');
        let tomorrow_date: string = dateFormat(new Date().setDate(new Date().getDate() + 1), 'dd mmm yyyy');

        if (date == today_date) {
            return 'Today';
        } else if (date == yesterday_date) {
            return 'Yesterday';
        } else if (date == tomorrow_date) {
            return 'Tomorrow';
        } else if (fullyear) {
            return dateFormat(date, 'dd mmm yyyy');
        } else {
            // return dateFormat(date, 'dd mmm yy');
            let shortyear: string = String(date).slice(-2);
            return String(date).slice(0, -4) + "'" + shortyear;
        }
    }

    /**
     * Funtion to change datetime into proper format for messages
     * @param datetime datetime
     * @param fullyear if want to show fullyear or not
     * @returns "time if today" or "yesterday" or "02 Aug 2019" or "02 Aug '19"
     */
    DatabaseToDisplayDateMessages(datetime: string, fullyear: boolean = false) {
        let now = new Date();
        let date: string = dateFormat(datetime, 'dd mmm yyyy');
        let today_date: string = dateFormat(now, 'dd mmm yyyy');
        let yesterday_date: string = dateFormat(now.setDate(now.getDate() - 1), 'dd mmm yyyy');

        if (date == today_date) {
            return dateFormat(datetime, 'h:MM TT');
            // return 'Today';
        } else if (date == yesterday_date) {
            return 'Yesterday';
        } else if (fullyear) {
            return dateFormat(date, 'dd mmm yyyy');
        } else {
            let shortyear: string = String(date).slice(-2);
            return String(date).slice(0, -4) + "'" + shortyear;
        }
    }

    /**
     * Function to return time from datetime
     * @param date date
     * @returns time only in am/pm format i.e "12:55 PM"
     */
    DatabaseToDisplayTimeOnly(date: string) {
        return dateFormat(date, 'h:MM TT');
    }

    /**
     * Get current financial year e.g 2020-2021
     */
    getCurrentFinancialYear(date: string = '') {
        let fiscalyear = "";
        let today = new Date();
        if (date && date != '') {
            today = new Date(date);
        }

        if ((today.getMonth() + 1) <= 3) {
            fiscalyear = (today.getFullYear() - 1) + "-" + today.getFullYear()
        } else {
            fiscalyear = today.getFullYear() + "-" + (today.getFullYear() + 1)
        }

        return fiscalyear
    }

    /**
     * Get Day from any date
     * @param date date
     * @param tolower if day should be lower case or not
     */
    getDayfromDate(date: string, tolower: boolean = false) {
        let days: string[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        let dateObj = new Date(date);
        let day: string = days[dateObj.getDay()];

        if (tolower) return day.toLowerCase();
        else return day;
    }

    /**
     * Function to get exact age from DOB
     * @param date birthdate
     * @returns returns age in days, months or years
     */
    getAgeFromDOB(date: string) {
        if (dateFormat(date, 'yyyy-mm-dd') == constants.DEFAULT_DATE) {
            return '-';
        }

        let today: any = new Date();
        let birthDate: any = new Date(date);

        let today_date: number = today.getDate();
        let today_month: number = today.getMonth();
        let today_year: number = today.getFullYear();
        let birth_date: number = birthDate.getDate();
        let birth_months: number = birthDate.getMonth();
        let birth_year: number = birthDate.getFullYear();

        let final_days: number = 0;
        let final_months: number = 0;
        let final_year: number = 0;

        if (today_date < birth_date) {
            today_date = today_date + 30;
            today_month = today_month - 1;
            final_days = today_date - birth_date;
        } else {
            final_days = today_date - birth_date;
        }

        if (today_month < birth_months) {
            today_month = today_month + 12;
            today_year = today_year - 1;
            final_months = today_month - birth_months;
        } else {
            final_months = today_month - birth_months;
        }

        final_year = today_year - birth_year;
        if (final_year > 0) return final_year + ' years';
        else if (final_months > 0) return final_months + ' months ';
        else if (final_days > 0) return final_days + ' days';
        else return '1 days';
    }

    /**
     * Encrypt any string to AES encryption key.
     * @param
     */
    cryptoAESEncryptionOld(string: string) {
        if (string == '') return '';
        return cryptoJs.AES.encrypt(string.toString(), constants.CRYPTO_AUTH_KEY).toString();
    }

    /**
     * Decrypt string from AES encryption string.
     * @param
     */
    cryptoAESDecryptionOld(string: string) {
        return cryptoJs.AES.decrypt(string.toString(), constants.CRYPTO_AUTH_KEY).toString(cryptoJs.enc.Utf8);
    }

    /**
     * Encrypt any string to AES encryption key same as PHP
     * @param
     */
    cryptoAESEncryption(string: string) {
        if (string == '') return '';

        let key: string = process.env.SECRET_AUTH_KEY || "";
        let iv: string = key.substr(0, 16);
        let cipher = crypto.createCipheriv(constants.CRYPTO_ENCRYPTION_METHOD, key, iv);
        let encrypted = cipher.update(String(string), 'utf8', 'base64') + cipher.final('base64');
        return encrypted;
    }

    /**
     * Decrypt string from AES encryption string same as PHP
     * @param
     */
    cryptoAESDecryption(string: string) {
        if (string == '') return '';

        let key: string = process.env.SECRET_AUTH_KEY || "";
        let iv: string = key.substr(0, 16);
        let cipher = crypto.createDecipheriv(constants.CRYPTO_ENCRYPTION_METHOD, key, iv);
        try {
            let decrypted = cipher.update(string, 'base64', 'utf8') + cipher.final('utf8');
            return decrypted;
        } catch (e) {
            return 0;
        }
    }

    /**
     * Encode any string or number to base64
     * @param string string to encode
     */
    base64Encode(string: string) {
        return Buffer.from(string).toString('base64');
    }

    /**
     * Decode any encoded string
     * @param encoded_string Base64 encoded string
     */
    base64Decode(encoded_string: string) {
        return Buffer.from(encoded_string, 'base64').toString('ascii');
    }

    /**
     * Parse JSON string to array or object
     * @param jsonstring json string
     */
    parseJson(jsonstring: string) {
        try {
            let result: any[] = JSON.parse(jsonstring);
            return result;
        } catch (error) {
            // console.log('Error in parsing JSON:');
            // console.log(error);
            return [];
        }
    }

    /**
     * Function to generate random numeric otp
     * @returns numeric 4 digit value
     */
    generateOTP() {
        return (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);
    }

    /**
     * Create random string for accesstoken etc with length
     * @param length length to create string for
     * @returns random string for given length
     */
    createRandomPassword(length: number) {
        /* let result = '';
        let characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        } */
        return Math.random().toString(36).substring(2, (length / 2) + 2) + Math.random().toString(36).substring(2, (length / 2) + 2);
    }

    /**
     * Convert string's first character to Upper Case
     * @param string string
     * @returns Updated string with Upper Case letters
     */
    ucfirst(string: string) {
        if (!string || typeof string != 'string' || string == "") return "";

        let pieces = string.trim().split(" ");
        for (let i = 0; i < pieces.length; i++) {
            var j = pieces[i].charAt(0).toUpperCase();
            pieces[i] = j + pieces[i].substr(1).toLowerCase();
        }
        return pieces.join(" ");
    }

    /**
     * Clear any string with trim, striptags and other validations.
     */
    clearifyString(string: string) {
        let final_string: string = "";
        if (!string || string == "") return final_string;

        final_string = String(string).trim();
        final_string = final_string.replace(/'/g, "\''");
        return final_string;
    }

    /**
     * Clear any string with trim, striptags and other validations.
     */
    clearifyNumber(string: string) {
        let final_string: string = "";
        if (!string) return final_string;

        final_string = string.trim();
        final_string = string.replace(/[-+]/g, "");
        // final_string = string.replace(/[-&\/\\#,+()$~%.'":*?<>{}]/g, '');
        return final_string;
    }

    /**
     * Request third party url with waiting for response
     * @param method get/post
     * @param url url to be called
     */
    async requestUrl(method: string, url: string, params: {} = {}, headers: any = {}, json_request: boolean = false) {
        let options = {
            method: method,
            url: url,
            body: querystring.stringify(params),
            headers: {
                'cache-control': 'no-cache',
                'content-type': 'application/x-www-form-urlencoded'
            }
        };
        if (Object.keys(headers).length > 0) {
            options.headers = headers;
        }
        if (json_request) {
            options.body = JSON.stringify(params);
        }

        let result: any = await new Promise(function (resolve, reject) {
            request(options, function (error, response, body) {
                if (error) {
                    return reject(error);
                }

                try {
                    resolve(body);
                } catch (e) {
                    reject(e);
                }
            });
        });

        return result;
    }

    /**
     * Get invoice url from order number based on encryption logic
     * @param order_number order number e.g OKRP0001
     */
    getInvoiceUrl(order_number: string, pharmacy_name: string, patient_name: string, print_url: boolean = false, sender_type: string = 'whatsapp') {
        let encoded_order_number: string = this.base64Encode(order_number);
        let invoice_url: string = config.PATIENT_SITE_URL + "invoice/" + encoded_order_number + "/";

        if (pharmacy_name == '' || patient_name == '') {
            if (print_url) return invoice_url + "print/";
            else return invoice_url;
        }

        let invoice_message: string = "Hi " + patient_name + ",\nThank you for your purchase at *" + pharmacy_name + "*. We hope to serve you again.\nClick to make Payment or view Invoice: " + invoice_url + "?source=WhatsApp\n\nIf the link is not clickable, please save this number and try again.\n\nYour trusted pharmacist,\n" + pharmacy_name;
        if (sender_type == 'sms') {
            invoice_url = config.NAKED_PATIENT_SITE_URL + "/i/" + encoded_order_number + "/";
            invoice_message = "Hi " + patient_name + ",\nThank you for your purchase at " + String(pharmacy_name).slice(0, 30) + ". We hope to serve you again.\nClick to make Payment or view Invoice: " + invoice_url + "\n\nTeam eVital";
        }

        return encodeURIComponent(invoice_message);
    }

    /**
     * Record new db error log
     * @param query Excuted query
     * @param error error of Node
     */
    recordNewLog(query: string, error: string) {
        let error_logsObj = new dberror_logs();
        error_logsObj.recordNewLog(query, error);
    }

    /**
     * Get Lat and Long from address
     * @param address address of chemist
     */
    async getLatitudeAndLongitudeFromAddress(address: string) {
        if (!address || address.trim() == '') return false;

        let options = {
            method: 'GET',
            url: "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(address) + "&key=" + constants.GOOGLE_API_KEY,
        };

        let result: any = await new Promise(function (resolve, reject) {
            request(options, function (error, response, body) {
                if (error) {
                    return reject(error);
                }

                try {
                    resolve(body);
                } catch (e) {
                    reject(e);
                }
            });
        });

        if (!result) return false;

        let address_details = JSON.parse(result);
        if (address_details.error) return false;

        return address_details;
    }

    /**
     * To check zipcode is valid or not
     * @param zipcode
     */
    async checkZipcodeValidOrNot(zipcode: string) {

        let url: string = "https://api.postalpincode.in/pincode/" + zipcode;
        let result = await this.requestUrl("GET", url, {}, {}, false);

        let address_details: any[] = this.parseJson(result);
        if (address_details.length == 0) return false;
        else return true;
    }

    /**
     * Get city and state from Zipcode
     * @param zipcode zipcode
     */
    async getCityStateCountryFromZipcode(zipcode: string) {
        let return_data = {
            city: "",
            state: "",
            country: ""
        }

        if (!zipcode || zipcode.trim() == '') return return_data;

        let url: string = "https://api.postalpincode.in/pincode/" + zipcode;
        let result = await this.requestUrl("GET", url, {}, {}, false);

        if (!result) return return_data;

        let address_details: any[] = this.parseJson(result);
        if (address_details.length == 0) return return_data;

        if (address_details[0]['Status'] == 'Success') {
            if (address_details[0]['PostOffice'].length > 0) {
                if (address_details[0]['PostOffice'][0]['District'] != '') {
                    return_data.city = address_details[0]['PostOffice'][0]['District'];
                }

                if (address_details[0]['PostOffice'][0]['State'] != '') {
                    return_data.state = address_details[0]['PostOffice'][0]['State'];
                }

                if (address_details[0]['PostOffice'][0]['Country'] != '') {
                    return_data.country = address_details[0]['PostOffice'][0]['Country'];
                }
            }
        }

        return return_data;
    }

    /**
     * Send output to client with status code and message
     * @param status_code status code of a response
     * @param status_message status message of a response
     * @param data response data
     * @returns object with 3 parameters
     */
    output(status_code: number, status_message: any, data: any = null) {
        if (this.languagevars[status_message]) status_message = this.languagevars[status_message];

        let output = {
            status_code: status_code.toString(),
            status_message: status_message,
            datetime: dateFormat(new Date(), 'yyyy-mm-dd HH:MM:ss'),
            data: data
        };

        /* if (data.length > 0 || Object.keys(data).length) {
            output.data = data;
        } else {
            delete output.data;
        } */

        return output;
    }

    /**
     * Generate transaction/order number
     * @param type sales, sales_return, purchase, purchase_return
     */
    generateOrderNumber(type: string) {
        let number0toZ: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

        let random_number: number = Math.floor((Math.random() * 12));
        let random_number2: number = Math.floor((Math.random() * 12));
        let random_number3: number = Math.floor((Math.random() * 12));

        let final_random_number: number = Number(random_number) + Number(random_number2) + Number(random_number3);
        let random_number_code: string = number0toZ[final_random_number];

        let count_code: string = this.valueToCodeConverter(new Date().getTime());

        type = String(type).toLowerCase();
        if (type == 'sales') {
            return 'O' + random_number_code + count_code;
        } else if (type == 'sales_return') {
            return 'Y' + random_number_code + count_code;
        } else if (type == 'purchase') {
            return 'Q' + random_number_code + count_code;
        } else if (type == 'purchase_return') {
            return 'Z' + random_number_code + count_code;
        } else if (type == 'prescription_group') {
            return 'X' + random_number_code + count_code;
        } else if (type == 'prescription') {
            return 'R' + random_number_code + count_code;
        } else if (type == 'transaction') {
            return 'T' + random_number_code + count_code;
        } else if (type == 'wholesale') {
            return 'Q' + random_number_code + count_code;
        } else {
            // Default sales
            return 'O' + random_number_code + count_code;
        }
    }

    /**
     * Function to convert any number into defined code
     * @param number number
     * @returns string of that number's code
     */
    valueToCodeConverter(number: number): string {
        let codes: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

        let modulo: number[] = [];
        modulo = this.getDividedValue(number, modulo);

        let arr_code: string[] = [];
        for (let key in modulo) {
            arr_code.push(codes[modulo[key]]);
        }
        arr_code = arr_code.reverse();
        return arr_code.join('');
    }

    /**
     * Function to get divided value to create code from a number
     * @param number number
     * @param modulo modulo of a number
     * @returns number
     */
    getDividedValue(number: number, modulo: number[]): number[] {
        modulo[modulo.length] = number % 36;
        let result: number = Math.floor(number / 36);

        if (result > 0) {
            return this.getDividedValue(result, modulo);
        } else {
            return modulo;
        }
    }

    randomAlphNumeric(size: any) {
        let alpha_key = '';
        let keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let keysSize = keys.length;

        for (let i = 0; i < 2; i++) {
            alpha_key += keys.charAt(Math.floor(Math.random() * keysSize));
        }

        let length = size - 2;

        let key = '';
        let numberkeys = '0123456789';
        let numberkeysSize = numberkeys.length;

        for (let i = 0; i < length; i++) {
            key += numberkeys.charAt(Math.floor(Math.random() * numberkeysSize));
        }

        return alpha_key + key;
    }

    setRoundOff(number: any) {
        return Number(number.toFixed(2));

        let return_number = '';
        return_number = number.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
        return return_number;
    }

    /**
     * Round value to 2 decimals
     * @param value value to round off
     */
    roundTwoDigit(value: number): number {
        if (!value || isNaN(value)) return 0;

        // Number(number.toFixed(2));
        return lodash_round(value, 2);
    }

    numberFormat(value: number) {
        if (!value || isNaN(value)) return 0;

        return Intl.NumberFormat('en-IN').format(Math.round(value));
    }

    /** To calculate percentage amount using given amount and discount percentage
     * @param amount
     * @param discount_percentage
     * @return float|void
     */
    calculatePercentageAmount(amount: number, discount_percentage: number) {
        if (amount == 0 || discount_percentage == 0) return 0;

        let discount_amount: any = ((Number(amount) * Number(discount_percentage)) / 100).toFixed(2);
        return Number(discount_amount);
    }

    calculateDateDiff(start_date: string, end_date: string) {
        var date1 = new Date(start_date);
        var date2 = new Date(end_date);

        var diff = Math.abs(date1.getTime() - date2.getTime());
        return Math.ceil(diff / (1000 * 3600 * 24));
    }

    hideAlternateMobileNumber(mobile: string) {
        if (mobile == '') return;
        return mobile.substr(0, 2) + "******" + mobile.substr(8);
    }

    slugify(string: string) {
        //Unwanted:  {lowercase} ; / ? : @ & = + $ , . ! ~ * ' ( ) / remove white space to dash
        string = string.toLowerCase().replace(/[^\w ]+/g, '').replace(/ +/g, '-');

        return string;
    }

    /**
     * Notify entity about any event on message and push notification
     * @param mobile mobile number of an entity
     * @param template_code template code for message
     * @param replace_array array of variables to be replaced
     * @param noti_to_id id of entity to whom notification will be sent
     * @param noti_to_entity entity to whom notificaition will be sent
     * @param is_send_push_notification boolean to check if notification will be send or not
     * @param noti_module module for notification is related to i.e order, message, prescription etc
     * @param module_id module id to open related module on notification click
     * @param noti_type notification type is used to display icons in notifications list
     */
    async notifyEntity(mobile: string, template_code: string, replace_array: {}, noti_to_id: number, noti_to_entity: string, is_send_push_notification: boolean, noti_module: string = '', module_id: string = '', noti_type: string = '', product: string = 'whitelabel',entity_id:number=0) {
        if (!template_code || template_code == "") return true;

        let sender_id = constants.DEFAULT_SENDER_ID;
        let auth_key = constants.MSG91_API_KEY;

        if(product == 'whitelabel' && entity_id > 0){
            // check setting of send customized sms is yes
            let settingObj = new dbsetting_values();
            let keys = [constants.SEND_CUSTOMIZED_SMS_SETTING_KEY, constants.SEND_SENDER_ID_SETTING_KEY];
            let setting_results = await settingObj.getEntitySettingsValues(entity_id, 'chemist','', true,keys);

            if(Object.keys(setting_results).length > 0 && setting_results[constants.SEND_CUSTOMIZED_SMS_SETTING_KEY] == 'yes'){

                if(setting_results[constants.SEND_SENDER_ID_SETTING_KEY] != ''){
                    sender_id = setting_results[constants.SEND_SENDER_ID_SETTING_KEY];
                    template_code = sender_id.toLowerCase()+'_'+template_code;
                }

                if(setting_results[constants.SEND_AUTH_ID_SETTING_KEY] && setting_results[constants.SEND_AUTH_ID_SETTING_KEY] != ''){
                    auth_key = setting_results[constants.SEND_AUTH_ID_SETTING_KEY];
                }
            }
        }

        let message_templatesObj = new dbmessage_templates();
        let message: any = await message_templatesObj.getMessage(template_code, replace_array, 'email_subject, sms_content, push_notification_content, notification_content, dlt_template_id');

        if (mobile !== '') {
            this.sendSMS(mobile, message['sms_content'], message['dlt_template_id'],sender_id,auth_key);
        }

        // Send Notification to database
        if (noti_type != '') {
            let table = 'users';

            if (noti_to_entity == 'chemist') {
                table = 'chemists';
            }

            let notifictaionObj = new dbnotifications();

            //update notification counter
            notifictaionObj.storeNotification(noti_to_id, noti_to_entity, noti_type, message['notification_content']);
            notifictaionObj.updateNotificationCounter(noti_to_id, table);
        }

        /* Send Push Notifications */
        if (is_send_push_notification && noti_to_id > 0 && noti_to_entity !== '') {
            this.sendPushNotificationToEntity(noti_to_id, noti_to_entity, message['email_subject'], message['push_notification_content'], noti_module, module_id, product);
        }
        return true;
    }

    /**
     * Function to be called to send Push Notifications with data of user's devices
     * @param entity_id id of entity to whom notification will be sent
     * @param entity entity to whom notification will be sent
     * @param title push notification title
     * @param message push notification detail message
     * @param type push notification type - module
     * @param id module id
     */
    async sendPushNotificationToEntity(entity_id: number, entity: string, title: string, message: string, type: string, id: string = '', product: string) {
        if (ENVIRONMENT == 'localhost') return;

        if (entity_id == 0 || entity == "" || message == "") {
            return false;
        }

        let entityObj = new dbchemist_device_users();
        let entity_devices: [] = await entityObj.getUserDevices(entity_id, entity, product, "active", false, ["android", "ios"]);
        if (!entity_devices || entity_devices.length == 0) return;

        for (let i = 0; i < entity_devices.length; i++) {
            if (entity_devices[i]['fcmtoken'] !== "") {
                let to: string = entity_devices[i]['fcmtoken'];
                let body: string = message;
                let device_type: string = entity_devices[i]['os'];
                let image: string = "";
                this.sendPushNotification(entity, to, title, body, image, type, String(id), device_type);
            }
        }
        return true;
    }

    /**
     *
     * @param entity entity to whom push notification will be sent
     * @param to fcm token of a device to send notification
     * @param title push notification title
     * @param body push notification message/body
     * @param image image url if image exist in push notification
     * @param type notification module
     * @param id module id
     * @param device_type device type - android/ios
     */
    sendPushNotification(entity: string, to: string = '', title: string, body: string, image: string = "", type: string, id: string = '', device_type: string) {
        if (ENVIRONMENT == 'localhost') return;

        if (entity == "" || !to || to == "" || title == "" || type == "" || device_type == "") return;

        var payload = {};
        if (device_type == 'android') {
            payload = {
                data: {
                    title: title,
                    body: body,
                    type: type,
                    image: image,
                    id: String(id)
                }
            };
        } else if (device_type == 'ios') {
            payload = {
                data: {
                    title: title,
                    body: body,
                    type: type,
                    image: image,
                    id: String(id)
                },
                notification: {
                    title: title,
                    body: body,
                    type: type,
                    image: image,
                    id: String(id)
                }
            };
        } else {
            return;
        }

        /* Android Push Notification */
        var initialization_path = chemist;

        initialization_path.messaging().sendToDevice(to, payload, {})
            .then(function (response: any) {
                // console.error("Successfully sent message:", response);
            })
            .catch(function (error: any) {
                console.error("Error sending message:", error);
            });

        return true;
    }


    /**
     * Send message to mobile number
     * @param mobile mobile number
     * @param message message string
     * @returns boolean - true
     */
    sendSMS(mobile: any, message: string, dlt_template_id: string = '',senderId:string,authKey:string) {
        if (!mobile || mobile == '' || !message || message == '' || dlt_template_id == '') return;

        let allowSendSms = false;
        if (ENVIRONMENT == 'production') allowSendSms = true;

        if (!allowSendSms) return;

        let mobileFirstNumber = mobile.substr(0, 1);
        if (mobileFirstNumber < 6) return;

        request('http://api.msg91.com/api/sendhttp.php?country=91&sender='+senderId+'&route=4&mobiles=' + mobile + '&authkey=' + authKey + '&encrypt=&message=' + encodeURIComponent(message) + '&flash=&unicode=&afterminutes=&response=&campaign=&DLT_TE_ID=' + dlt_template_id);

        return true;
    }

    /**
     * Generate short dynamic link for entity multiple purpose
     * @param entity_code entity unique code
     * @param entity entity
     */
    async generateDynamicLink(chemist_id: number, link_entity: string, utmSource: string, utmMedium: string, utmCampaign: string, link: string = config.PATIENT_SITE_URL) {
        if (utmSource == '' || chemist_id == 0) return '';

        // get FIREBASE_API_KEY, SHORT_LINK_PREFIX, ANDROID_PACKAGE_NAME from api_client_token table
        let api_client_tokenObj = new dbapi_clients_tokens();
        let devices_res = await api_client_tokenObj.getRecords(chemist_id, link_entity);
        var options = {
            method: 'POST',
            url: "https://firebasedynamiclinks.googleapis.com/v1/shortLinks?key=" + devices_res['firebase_api_key'].value,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                dynamicLinkInfo: {
                    domainUriPrefix: devices_res['short_link_prefix'].value,
                    link: link,
                    androidInfo: {
                        androidPackageName: encodeURIComponent(devices_res['android_package_name'].value)
                    },
                    // iosInfo: {
                    //     iosBundleId: encodeURIComponent(constants.IOS_BUNDLE_ID),
                    //     iosAppStoreId: encodeURIComponent(constants.IOS_APP_STORE_ID)
                    // },
                    analyticsInfo: {
                        googlePlayAnalytics: {
                            utmSource: encodeURIComponent(utmSource),
                            utmMedium: encodeURIComponent(utmMedium),
                            utmCampaign: encodeURIComponent(utmCampaign)
                        }
                    }
                }
            },
            json: true
        };

        let result: any = await new Promise(function (resolve, reject) {
            request(options, function (error, response, body) {
                if (error) {
                    reject(error);
                }
                try {
                    resolve(body);
                } catch (e) {
                    reject(e);
                }
            });
        });

        if (!result) return '';

        let link_details = result;
        if (link_details.error) return '';

        if (!link_details['shortLink'] || link_details['shortLink'] == undefined) return '';
        else return link_details['shortLink'];
    }


    permutator(inputArr: any) {
        var results: any = [];
        inputArr = inputArr.map(function (entry: any) { return entry.trim(); });

        const permute = (arr: any, memo: any = '') => {
            if (arr.length === 0) {
                results.push(memo);
            } else {
                for (let i = 0; i < arr.length; i++) {
                    let curr = arr.slice();
                    let next = curr.splice(i, 1);
                    if (memo != '') {
                        permute(curr.slice(), memo + ','.concat(next))
                    } else { permute(curr.slice(), memo.concat(next)) }

                }
            }
        }

        permute(inputArr);

        return results;
    }

    breakName(name: string) {
        if (name == '') return false;

        let lastname = '';

        /* Break first name with space and set other value in last name if last name comes blank in request */
        let nameBreakArray = name.split(" ");
        if (nameBreakArray.length > 1) {
            name = nameBreakArray[0];
            delete (nameBreakArray[0]);
            lastname = nameBreakArray.join(' ');
        }

        return { firstname: name, lastname: lastname };
    }
}
