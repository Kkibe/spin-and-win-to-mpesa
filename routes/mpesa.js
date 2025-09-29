const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { isAuthenticated } = require('../middleware/auth');

const getDarajaAccessToken = async () => {
    const response = await fetch("https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
        method: "GET",
        headers: {
            "Authorization": "Basic " + Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString("base64")
        }
    });

    const data = await response.json();
    return data.access_token;
};

router.post("/", isAuthenticated, async (req, res) => {
    let { amount, number } = req.body;

    if (number.startsWith("0")) {
        number = "254" + number.slice(1);
    } else if(number.startsWith('+')) {
        number = number.substring(1);
    }

    try {
        const accessToken = await getDarajaAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
        const password = Buffer.from(`${process.env.DARAJA_SHORT_CODE}${process.env.DARAJA_PASSKEY}${timestamp}`).toString("base64");

        const stkPushData = {
            BusinessShortCode: process.env.DARAJA_SHORT_CODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: number,
            PartyB: process.env.DARAJA_SHORT_CODE,
            PhoneNumber: number,
            CallBackURL: "https://your-callback-url.com/callback", // Update this
            AccountReference: "ACCOUNT_ACTIVATION",
            TransactionDesc: "Account Activation"
        };

        const stkPushResponse = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(stkPushData)
        });

        const result = await stkPushResponse.json();
        
        // If payment is successful, activate user
        if (result.ResponseCode === "0") {
            // Activate user and add spins
            const updatedUser = await User.findByIdAndUpdate(
                req.session.user._id,
                {
                    $set: {
                        isActivated: true,
                        spins: (req.session.user.spins || 0) + 50 // Add 50 spins on activation
                    }
                },
                { new: true }
            );
            
            // Update session user data
            req.session.user.isActivated = updatedUser.isActivated;
            req.session.user.spins = updatedUser.spins;
        }
        
        req.session.result = result;
        res.redirect("/deposit");

    } catch (error) {
        console.error('Mpesa error:', error);
        req.session.result = { errorMessage: "Payment processing failed. Please try again." };
        res.redirect("/deposit");
    }
});

module.exports = router;
