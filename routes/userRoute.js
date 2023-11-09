const express = require('express');
const userRoute = express.Router();
const passport = require('passport')
const userController = require("../controller/userContrl")
const cartController = require('../controller/cartContrl')
const orderController = require("../controller/orderContrl");
const addressController = require('../controller/addressContrl')
const checkoutController = require("../controller/checkoutController");



const { ensureNotAuthenticated, ensureAuthenticated } = require('../middlewares/userAuth')
const validateID = require('../middlewares/idValidation')



userRoute.use((req, res, next) => {
    req.app.set('layout', 'shop/layoutPage');
    next();
  }) 



// userRoute setting----
userRoute.get('/', userController.loadLandingPage); /* Loading home page */

userRoute.get('/register', ensureNotAuthenticated,userController.loadRegister); /* Register Page */
userRoute.post('/register',ensureNotAuthenticated, userController.insertUser);
userRoute.get('/sendOTP', ensureNotAuthenticated, userController.sendOTPpage); /* otp sending */
userRoute.post('/sendOTP', ensureNotAuthenticated, userController.verifyOTP);
userRoute.get('/reSendOTP', ensureNotAuthenticated, userController.reSendOTP); /* otp Resending */
userRoute.post('/reSendOTP', ensureNotAuthenticated, userController.verifyResendOTP);

userRoute.get('/login',  ensureNotAuthenticated, userController.loadLogin);
userRoute.post('/login', ensureNotAuthenticated,
  passport.authenticate('local', {
    successRedirect: '/', // Redirect on successful login
    failureRedirect: '/login', // Redirect on failed login
    failureFlash: true, // enable flash messages
  }));


userRoute.get('/logout', ensureAuthenticated, userController.userLogout);

userRoute.get('/contact', userController.contact);
userRoute.get('/about', userController.aboutUs);

userRoute.get('/profile', ensureAuthenticated, userController.userProfile);
userRoute.get("/wallet/:id", userController.walletTransactionspage);

// userRoute.post("/review/add/:id", userController.addReview);

// Address_Routes__
userRoute.get('/savedAddress', ensureAuthenticated, addressController.savedAddress)
userRoute.get('/addAddress', ensureAuthenticated, addressController.addAddressPage)
userRoute.post('/addAddress', ensureAuthenticated, addressController.insertAddress)
userRoute.get('/editAddress/:id',  ensureAuthenticated, addressController.editAddressPage)
userRoute.post('/editAddress/:id', ensureAuthenticated, addressController.updateAddress)
userRoute.get('/deleteAddress/:id', ensureAuthenticated, addressController.deleteAddress)




// shopping_section--- 
userRoute.get('/shop', userController.shopping);   /* shopping page */
userRoute.get('/viewProduct/:id',  userController.viewProduct); /* view single product */

// userRoute.get('/categoryShop',userController.categoryPage)

userRoute.get('/wishlist', ensureAuthenticated,userController.wishlist);
userRoute.get('/addTo-wishlist/:id',  ensureAuthenticated, userController.addTowishlist);
userRoute.get('/removeWishlist/:id', ensureAuthenticated, userController.removeItemfromWishlist);

userRoute.post("/review/add/:id", userController.addReview);
userRoute.get("/wallet/:id",ensureAuthenticated, userController.walletTransactionspage);

//search 

// userRoute.post('/shop/search', userController.search);

// cart_section-- 
userRoute.get('/cart', ensureAuthenticated, cartController.cartpage);
userRoute.get('/cart/add/:id', ensureAuthenticated, cartController.addToCart);
userRoute.get('/remove/:id', ensureAuthenticated, cartController.removeFromCart);

userRoute.get('/cart/inc/:id',ensureAuthenticated, cartController.incQuantity);
userRoute.get('/cart/dec/:id', ensureAuthenticated, cartController.decQuantity);




// Order Routes
userRoute.get("/orders", orderController.orderspage);
userRoute.get("/orders/:id", orderController.singleOrder);
userRoute.put("/orders/:id", orderController.cancelOrder);
userRoute.put("/orders/single/:id", orderController.cancelSingleOrder);
userRoute.post("/orders/return/:id", orderController.returnOrder);


//checkout routes
            
userRoute.post("/checkout", checkoutController.checkoutpage);
userRoute.get("/checkout/get", checkoutController.getCartData);
userRoute.post("/place-order", checkoutController.placeOrder);
userRoute.get("/order-placed/:id", checkoutController.orderPlaced);
userRoute.post("/verify-payment", checkoutController.verifyPayment);
userRoute.post("/update", checkoutController.updateCheckoutPage);
userRoute.post("/coupon", checkoutController.updateCoupon);
userRoute.get("/coupon/remove", checkoutController.removeAppliedCoupon);



//404 notfound page--
userRoute.get('*',(req,res)=>{res.render('./shop/pages/page404')})
// 

module.exports = userRoute;


