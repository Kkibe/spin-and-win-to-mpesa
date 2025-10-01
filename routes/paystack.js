const axios = require('axios');
const router = require('express').Router();
const User = require("../models/User");
const { isAuthenticated } = require('../middleware/auth');

// Enhanced status mapping with user-friendly messages
const STATUS_MESSAGES = {
    abandoned: {
        message: "Payment was not completed. Please try again.",
        color: "warning",
        icon: "⏹️",
        userAction: "retry"
    },
    failed: {
        message: "Payment failed. Please check your details and try again.",
        color: "error",
        icon: "❌",
        userAction: "retry"
    },
    ongoing: {
        message: "Payment in progress. Please complete the authorization on your phone.",
        color: "info",
        icon: "🔄",
        userAction: "wait"
    },
    pending: {
        message: "Payment is being processed. Please wait...",
        color: "info",
        icon: "⏳",
        userAction: "wait"
    },
    processing: {
        message: "Payment is being processed. This may take a few moments.",
        color: "info",
        icon: "⚙️",
        userAction: "wait"
    },
    queued: {
        message: "Payment has been queued and will be processed shortly.",
        color: "info",
        icon: "📋",
        userAction: "wait"
    },
    reversed: {
        message: "Payment was reversed. Please contact support if this was unexpected.",
        color: "warning",
        icon: "↩️",
        userAction: "contact_support"
    },
    success: {
        message: "Payment successful! Your account has been activated.",
        color: "success",
        icon: "✅",
        userAction: "complete"
    },
    pay_offline: {
        message: "Please complete authorization on your mobile phone.",
        color: "info",
        icon: "📱",
        userAction: "authorize"
    },
    send_otp: {
        message: "OTP sent to your phone. Please enter it to continue.",
        color: "info",
        icon: "🔐",
        userAction: "enter_otp"
    }
};

// Enhanced payment initialization with better status handling
router.post('/initialize', isAuthenticated, async (req, res) => {
    const { email, amount, phone } = req.body;

    console.log('=== ENHANCED PAYSTACK INITIALIZE ===');
    console.log('Request body:', { email, amount, phone });

    if (!email || !amount || !phone) {
        return res.status(400).json({
            success: false,
            message: 'Email, amount, and phone are required'
        });
    }

    try {
        // Format phone number for M-Pesa
        let formattedPhone = phone.replace(/\s+/g, '').replace(/[-()]/g, '');

        if (formattedPhone.startsWith("0")) {
            formattedPhone = "+254" + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('254')) {
            formattedPhone = "+" + formattedPhone;
        }

        console.log('Formatted phone:', formattedPhone);

        // Validate M-Pesa format
        const mpesaPhoneRegex = /^\+254[17]\d{8}$/;
        if (!mpesaPhoneRegex.test(formattedPhone)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Kenyan M-Pesa number. Use +2547XXXXXXXX or +2541XXXXXXXX'
            });
        }

        // Create payload
        const paystackPayload = {
            email: email,
            amount: amount * 100,
            currency: "KES",
            mobile_money: {
                phone: formattedPhone,
                provider: "mpesa"
            },
            metadata: {
                user_id: req.session.user._id,
                activation_type: "account_activation",
                timestamp: new Date().toISOString()
            }
        };

        console.log('M-Pesa payload:', JSON.stringify(paystackPayload, null, 2));

        // Initialize charge
        const response = await axios.post(
            'https://api.paystack.co/charge',
            paystackPayload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        console.log('Paystack response:', JSON.stringify(response.data, null, 2));

        const { reference, status, display_text, message, gateway_response } = response.data.data;

        // Enhanced status handling
        const statusInfo = STATUS_MESSAGES[status] || {
            message: message || 'Payment processing',
            color: 'info',
            icon: 'ℹ️',
            userAction: 'wait'
        };

        const responseData = {
            success: true,
            message: statusInfo.message,
            reference: reference,
            status: status,
            display_text: display_text,
            gateway_response: gateway_response,
            status_icon: statusInfo.icon,
            status_color: statusInfo.color,
            user_action: statusInfo.userAction,
            requires_authorization: status === 'pay_offline',
            requires_otp: status === 'send_otp',
            timestamp: new Date().toISOString()
        };

        // Immediate success handling
        if (status === 'success') {
            await activateUser(req, req.session.user._id);
            responseData.account_activated = true;
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error('=== PAYMENT INITIALIZATION ERROR ===');

        if (error.response) {
            console.error('Paystack error:', error.response.data);

            const paystackError = error.response.data;
            let userMessage = 'Payment initialization failed. Please try again.';
            let errorType = 'payment_error';

            if (paystackError.message) {
                if (paystackError.message.includes('phone')) {
                    userMessage = 'Invalid phone number format. Please use +2547XXXXXXXX or 07XXXXXXXX.';
                    errorType = 'phone_format_error';
                } else if (paystackError.message.includes('amount')) {
                    userMessage = 'Invalid amount. Please try a different amount.';
                    errorType = 'amount_error';
                } else {
                    userMessage = paystackError.message;
                }
            }

            res.status(500).json({
                success: false,
                message: userMessage,
                error_type: errorType,
                error: paystackError,
                timestamp: new Date().toISOString()
            });
        } else {
            console.error('Network error:', error.message);
            res.status(500).json({
                success: false,
                message: 'Network error. Please check your connection and try again.',
                error_type: 'network_error',
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Enhanced transaction verification
router.get('/verify/:reference', isAuthenticated, async (req, res) => {
    const { reference } = req.params;

    console.log('=== ENHANCED TRANSACTION VERIFICATION ===');
    console.log('Reference:', reference);

    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        console.log('Verification response:', JSON.stringify(response.data, null, 2));

        const data = response.data.data;
        const statusInfo = STATUS_MESSAGES[data.status] || STATUS_MESSAGES.pending;

        const verificationData = {
            success: true,
            paid: data.status === 'success',
            status: data.status,
            message: data.gateway_response || statusInfo.message,
            status_icon: statusInfo.icon,
            status_color: statusInfo.color,
            user_action: statusInfo.userAction,
            amount: data.amount / 100,
            currency: data.currency,
            paid_at: data.paid_at,
            created_at: data.created_at,
            gateway_response: data.gateway_response,
            timestamp: new Date().toISOString()
        };

        // Activate user if payment is successful
        if (data.status === 'success') {
            await activateUser(req, req.session.user._id);
            verificationData.account_activated = true;
            verificationData.activation_message = 'Account successfully activated with 50 spins!';
        }

        res.json(verificationData);

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to verify payment status',
            error_type: 'verification_error',
            timestamp: new Date().toISOString()
        });
    }
});

// Enhanced status polling endpoint
router.get('/status/:reference', isAuthenticated, async (req, res) => {
    const { reference } = req.params;

    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                },
            }
        );

        const data = response.data.data;
        const statusInfo = STATUS_MESSAGES[data.status] || STATUS_MESSAGES.pending;

        const statusData = {
            success: true,
            paid: data.status === 'success',
            status: data.status,
            message: data.gateway_response || statusInfo.message,
            status_icon: statusInfo.icon,
            status_color: statusInfo.color,
            user_action: statusInfo.userAction,
            can_retry: ['abandoned', 'failed', 'reversed'].includes(data.status),
            requires_action: ['ongoing', 'pay_offline', 'send_otp'].includes(data.status),
            is_processing: ['pending', 'processing', 'queued'].includes(data.status),
            timestamp: new Date().toISOString()
        };

        // Activate user if payment is successful
        if (data.status === 'success') {
            await activateUser(req, req.session.user._id);
            statusData.account_activated = true;
        }

        res.json(statusData);

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to check payment status',
            error_type: 'status_check_error',
            timestamp: new Date().toISOString()
        });
    }
});

// Get transaction history for user
router.get('/history', isAuthenticated, async (req, res) => {
    try {
        // This would typically query your database for user's transaction history
        // For now, we'll return a mock response showing the capability

        res.json({
            success: true,
            transactions: [],
            message: 'Transaction history endpoint ready',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({
            success: false,
            message: 'Unable to fetch transaction history',
            timestamp: new Date().toISOString()
        });
    }
});

// Helper function to activate user
async function activateUser(req, userId) {
    try {
        console.log('Activating user:', userId);

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    isActivated: true,
                    spins: (req.session.user.spins || 0) + 50,
                    activatedAt: new Date()
                }
            },
            { new: true }
        );

        // Update session
        req.session.user.isActivated = updatedUser.isActivated;
        req.session.user.spins = updatedUser.spins;

        console.log('User activated successfully:', updatedUser.email);
        return updatedUser;
    } catch (error) {
        console.error('Error activating user:', error);
        throw error;
    }
}

module.exports = router;
