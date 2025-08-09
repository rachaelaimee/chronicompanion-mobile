/**
 * ChroniCompanion AI Coach Backend API - WORKING VERSION
 * 
 * This is the minimal working version that fixes CORS issues
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const Stripe = require('stripe');
const { Resend } = require('resend');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const resendApiKey = process.env.RESEND_API_KEY;

console.log('🚀 ChroniCompanion AI Coach API Starting...');
console.log('- PORT:', port);
console.log('- OPENAI_API_KEY:', openaiApiKey ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
console.log('- STRIPE_SECRET_KEY:', stripeSecretKey ? '✅ Set' : '❌ Missing');
console.log('- RESEND_API_KEY:', resendApiKey ? '✅ Set' : '❌ Missing');

// Initialize services
let openai = null;
let supabase = null;
let stripe = null;
let resend = null;

if (openaiApiKey) {
    try {
        openai = new OpenAI({ apiKey: openaiApiKey });
        console.log('✅ OpenAI client initialized');
    } catch (error) {
        console.error('❌ OpenAI initialization failed:', error.message);
    }
}

if (supabaseUrl && supabaseServiceKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase client initialized');
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error.message);
    }
}

if (stripeSecretKey) {
    try {
        stripe = new Stripe(stripeSecretKey);
        console.log('✅ Stripe client initialized');
    } catch (error) {
        console.error('❌ Stripe initialization failed:', error.message);
    }
}

if (resendApiKey) {
    try {
        resend = new Resend(resendApiKey);
        console.log('✅ Resend client initialized');
    } catch (error) {
        console.error('❌ Resend initialization failed:', error.message);
    }
}

// CORS Configuration - Allow all origins for debugging
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ChroniCompanion AI Coach Backend',
        environment: {
            openai_configured: !!openai,
            supabase_configured: !!supabase
        }
    });
});

// Explicit preflight handling for AI Coach endpoint
app.options('/api/ai-coach', (req, res) => {
    console.log('🛸 AI Coach preflight request from:', req.headers.origin);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    res.status(204).end();
});

// AI Coach endpoint
app.post('/api/ai-coach', async (req, res) => {
    console.log('🤖 AI Coach request from:', req.headers.origin);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');

    try {
        // Check if OpenAI is configured
        if (!openai) {
            console.error('❌ OpenAI not configured');
            return res.status(500).json({
                success: false,
                error: 'AI service is not available. Please check configuration.'
            });
        }

        // Validate request body
        const { question, healthContext } = req.body;
        if (!question || typeof question !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Question is required and must be a string.'
            });
        }

        // Get user from JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token is required.'
            });
        }

        const token = authHeader.split(' ')[1];
        let user = null;
        
        if (supabase) {
            try {
                const { data, error } = await supabase.auth.getUser(token);
                if (error) {
                    console.error('❌ Auth error:', error);
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or expired token.'
                    });
                }
                user = data.user;
                console.log('✅ User authenticated:', user.email);
            } catch (authError) {
                console.error('❌ Token validation error:', authError);
                return res.status(401).json({
                    success: false,
                    error: 'Token validation failed.'
                });
            }
        }

        // SECURITY FIX: Server-side premium validation
        if (user) {
            console.log('🔍 Verifying premium subscription for user:', user.email);
            try {
                const { data: subscription, error } = await supabase
                    .from('user_subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single();
                    
                if (error && error.code !== 'PGRST116') {
                    console.error('❌ Premium verification error:', error);
                    return res.status(500).json({
                        success: false,
                        error: 'Premium verification failed.'
                    });
                }
                
                if (!subscription) {
                    console.log('🔒 Premium subscription required for AI Coach access');
                    return res.status(403).json({
                        success: false,
                        error: 'Premium subscription required for AI Coach features. Please upgrade to access unlimited AI insights.'
                    });
                }
                
                console.log('✅ Premium subscription verified:', subscription.plan);
            } catch (premiumError) {
                console.error('❌ Premium verification exception:', premiumError);
                return res.status(500).json({
                    success: false,
                    error: 'Premium verification failed.'
                });
            }
        }

        // Build simple prompt
        let prompt = `You are Chroni, a helpful AI health companion for ChroniCompanion app users.

User's question: "${question}"

Please provide a concise, helpful, and empathetic response focused on chronic illness management and health tracking insights. Keep it under 200 words.`;

        if (healthContext && healthContext.recentEntries && healthContext.recentEntries.length > 0) {
            const entriesText = healthContext.recentEntries.slice(0, 3).map(entry => 
                `Date: ${entry.entry_date}, Mood: ${entry.mood}/10, Energy: ${entry.energy}/10, Pain: ${entry.pain}/10, Sleep: ${entry.sleep}/10`
            ).join('\n');
            prompt = `You are Chroni, a helpful AI health companion for ChroniCompanion app users.

Recent health entries:
${entriesText}

User's question: "${question}"

Please provide a concise, helpful, and empathetic response based on their health data. Keep it under 200 words.`;
        }
        
        console.log('🧠 Sending request to OpenAI...');
        console.log('📝 Prompt length:', prompt.length);
        console.log('🔑 OpenAI client available:', !!openai);
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.7
        });
        
        console.log('📊 OpenAI response:', completion.choices?.[0]?.message?.content?.substring(0, 100) + '...');

        const insight = completion.choices[0]?.message?.content;
        
        if (!insight) {
            throw new Error('No response generated from AI service');
        }

        console.log('✅ OpenAI response generated');

        // Return success response
        res.json({
            success: true,
            insight: insight,
            isPremium: false,
            remainingQuestions: 4
        });

    } catch (error) {
        console.error('❌ AI Coach error:', error);
        console.error('❌ Error type:', error.constructor.name);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error status:', error.status);
        
        // Handle specific OpenAI errors
        if (error.code === 'rate_limit_exceeded') {
            return res.status(429).json({
                success: false,
                error: 'AI service is currently busy. Please try again in a moment.'
            });
        }
        
        if (error.code === 'insufficient_quota') {
            return res.status(503).json({
                success: false,
                error: 'AI service is temporarily unavailable. Please try again later.'
            });
        }
        
        if (error.status === 401) {
            return res.status(503).json({
                success: false,
                error: 'AI service authentication failed. Please contact support.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Sorry, I encountered an error. Please try again later. 🤖💔',
            debug: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// =============================================================================
// STRIPE PAYMENT ENDPOINTS
// =============================================================================

// Create Stripe Checkout Session
app.post('/api/create-checkout-session', async (req, res) => {
    console.log('🛒 Creating Stripe checkout session...');
    
    try {
        // Validate Stripe is configured
        if (!stripe) {
            return res.status(503).json({
                success: false,
                error: 'Payment service not configured'
            });
        }
        
        // Validate request body
        const { user_id, user_email, success_url, cancel_url } = req.body;
        if (!user_id || !user_email || !success_url || !cancel_url) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: user_id, user_email, success_url, cancel_url'
            });
        }
        
        console.log('📧 Creating session for:', user_email);
        
        // Create Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer_email: user_email,
            client_reference_id: user_id, // This will help us identify the user in webhooks
            line_items: [
                {
                    price: 'prod_SpoSak2dwIG1Ym', // ChroniCompanion Premium - $4.99/month
                    quantity: 1,
                },
            ],
            success_url: success_url,
            cancel_url: cancel_url,
            metadata: {
                user_id: user_id,
                plan: 'premium'
            }
        });
        
        console.log('✅ Stripe session created:', session.id);
        
        res.json({
            success: true,
            sessionId: session.id
        });
        
    } catch (error) {
        console.error('❌ Stripe checkout session creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create checkout session'
        });
    }
});

// Create Customer Portal Session for Subscription Management
app.post('/api/create-customer-portal-session', async (req, res) => {
    console.log('🏪 Creating customer portal session...');
    
    try {
        // Validate Stripe is configured
        if (!stripe) {
            console.error('❌ Stripe not configured');
            return res.status(503).json({ 
                success: false, 
                error: 'Payment service not configured' 
            });
        }
        
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required'
            });
        }
        
        console.log('👤 Creating portal session for user:', userId);
        
        // Find the customer in Stripe using metadata or email
        // First, get user's subscription from our database
        if (!supabase) {
            console.error('❌ Supabase not configured');
            return res.status(503).json({ 
                success: false, 
                error: 'Database service not configured' 
            });
        }
        
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();
        
        if (error) {
            console.error('❌ Supabase error:', error);
            return res.status(500).json({
                success: false,
                error: 'Database error: ' + error.message
            });
        }
        
        if (!subscription) {
            console.error('❌ No active subscription found for user:', userId);
            return res.status(404).json({
                success: false,
                error: 'No active subscription found. Please ensure you have an active premium subscription.'
            });
        }
        
        console.log('💳 Found subscription:', subscription);
        
        if (!subscription.subscription_id) {
            console.error('❌ Subscription has no Stripe subscription_id');
            return res.status(400).json({
                success: false,
                error: 'Invalid subscription data. Please contact support.'
            });
        }
        
        // Get the Stripe subscription to find the customer
        console.log('🔍 Retrieving Stripe subscription:', subscription.subscription_id);
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.subscription_id);
        const customerId = stripeSubscription.customer;
        
        console.log('👤 Customer ID:', customerId);
        
        // Create the portal session
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: 'https://chronicompanion.app/#premium-settings', // Return to premium settings
        });
        
        console.log('✅ Portal session created:', portalSession.id);
        
        res.json({
            success: true,
            url: portalSession.url
        });
        
    } catch (error) {
        console.error('❌ Customer portal error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create customer portal session'
        });
    }
});

// Send Feedback Email Endpoint
app.post('/api/send-feedback', async (req, res) => {
    console.log('📧 Sending feedback email...');
    
    try {
        const { feedback, userEmail, userId, source } = req.body;
        
        if (!feedback) {
            return res.status(400).json({
                success: false,
                error: 'Feedback content is required'
            });
        }
        
        // Send email using Resend
        if (!resend) {
            console.error('❌ Resend not configured');
            return res.status(503).json({
                success: false,
                error: 'Email service not configured. Please set RESEND_API_KEY environment variable.'
            });
        }
        
        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">📧 ChroniCompanion Feedback</h2>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>From:</strong> ${userEmail}</p>
                    <p><strong>User ID:</strong> ${userId}</p>
                    <p><strong>Source:</strong> ${source}</p>
                    <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
                </div>
                
                <div style="background: #ffffff; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
                    <h3 style="color: #374151; margin-top: 0;">Feedback:</h3>
                    <p style="white-space: pre-wrap; line-height: 1.6;">${feedback}</p>
                </div>
                
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                    This email was sent automatically from ChroniCompanion.
                </p>
            </div>
        `;
        
        try {
            const emailResult = await resend.emails.send({
                from: 'ChroniCompanion <feedback@chronicompanion.app>',
                to: ['ivytenebrae1@gmail.com'],
                subject: '📧 ChroniCompanion Feedback',
                html: emailHtml,
                text: `
New feedback received from ChroniCompanion:

From: ${userEmail}
User ID: ${userId}
Source: ${source}
Date: ${new Date().toLocaleString()}

Feedback:
${feedback}
                `.trim()
            });
            
            console.log('✅ Email sent successfully:', emailResult.id);
            
            res.json({
                success: true,
                message: 'Feedback sent successfully',
                emailId: emailResult.id
            });
            
        } catch (emailError) {
            console.error('❌ Email sending failed:', emailError);
            
            // Fallback: still log the feedback even if email fails
            console.log('📧 Feedback (email failed):', {
                from: userEmail,
                userId: userId,
                source: source,
                feedback: feedback,
                date: new Date().toLocaleString()
            });
            
            res.status(500).json({
                success: false,
                error: 'Failed to send email. Please try again or contact support directly.',
                details: emailError.message
            });
        }
        
    } catch (error) {
        console.error('❌ Send feedback error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send feedback'
        });
    }
});

// Stripe Webhook Handler
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    console.log('🔔 Stripe webhook received');
    
    try {
        // Validate Stripe and Supabase are configured
        if (!stripe || !supabase) {
            console.error('❌ Stripe or Supabase not configured for webhooks');
            return res.status(503).json({ error: 'Service not configured' });
        }
        
        const sig = req.headers['stripe-signature'];
        let event;
        
        try {
            // For now, we'll skip webhook signature verification in development
            // In production, you should set STRIPE_WEBHOOK_SECRET and verify signatures
            event = JSON.parse(req.body);
            console.log('🎯 Webhook event type:', event.type);
        } catch (err) {
            console.error('❌ Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
        
        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                console.log('💳 Payment successful for session:', session.id);
                console.log('👤 User ID:', session.client_reference_id);
                console.log('📧 Customer email:', session.customer_email);
                
                // Add premium subscription to database
                if (session.client_reference_id) {
                    try {
                        const { data, error } = await supabase
                            .from('user_subscriptions')
                            .insert([{
                                user_id: session.client_reference_id,
                                subscription_id: session.subscription,
                                platform: 'stripe',
                                status: 'active',
                                plan: 'premium',
                                email: session.customer_email, // Add customer email for identification
                                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
                            }]);
                        
                        if (error) {
                            console.error('❌ Failed to create subscription record:', error);
                        } else {
                            console.log('✅ Premium subscription activated for user:', session.client_reference_id);
                        }
                    } catch (dbError) {
                        console.error('❌ Database error:', dbError);
                    }
                }
                break;
                
            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                console.log('🔄 Subscription updated:', updatedSubscription.id);
                
                // Handle subscription updates (plan changes, quantity changes, cancellation scheduling)
                try {
                    const updateData = {
                        status: updatedSubscription.status,
                    };
                    
                    // If subscription is scheduled for cancellation
                    if (updatedSubscription.cancel_at_period_end) {
                        updateData.status = 'cancelling'; // Will be cancelled at period end
                        console.log('📅 Subscription scheduled for cancellation at period end');
                    }
                    
                    const { error } = await supabase
                        .from('user_subscriptions')
                        .update(updateData)
                        .eq('subscription_id', updatedSubscription.id);
                    
                    if (error) {
                        console.error('❌ Failed to update subscription:', error);
                    } else {
                        console.log('✅ Subscription updated in database');
                    }
                } catch (dbError) {
                    console.error('❌ Database error:', dbError);
                }
                break;
                
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                console.log('❌ Subscription cancelled:', subscription.id);
                
                // Update subscription status to cancelled
                try {
                    const { error } = await supabase
                        .from('user_subscriptions')
                        .update({ status: 'cancelled' })
                        .eq('subscription_id', subscription.id);
                    
                    if (error) {
                        console.error('❌ Failed to cancel subscription:', error);
                    } else {
                        console.log('✅ Subscription cancelled in database');
                    }
                } catch (dbError) {
                    console.error('❌ Database error:', dbError);
                }
                break;
                
            case 'payment_method.attached':
                console.log('💳 Payment method attached:', event.data.object.id);
                break;
                
            case 'payment_method.detached':
                console.log('💳 Payment method detached:', event.data.object.id);
                break;
                
            case 'customer.updated':
                console.log('👤 Customer updated:', event.data.object.id);
                break;
                
            default:
                console.log(`🤷 Unhandled event type: ${event.type}`);
        }
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('❌ Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🤖 ChroniCompanion AI Coach API running on 0.0.0.0:${port}`);
    console.log(`🔐 OpenAI: ${openai ? 'Ready' : 'Not configured'}`);
    console.log(`🗄️  Supabase: ${supabase ? 'Ready' : 'Not configured'}`);
    console.log(`💳 Stripe: ${stripe ? 'Ready' : 'Not configured'}`);
    console.log(`📧 Resend: ${resend ? 'Ready' : 'Not configured'}`);
});

module.exports = app;