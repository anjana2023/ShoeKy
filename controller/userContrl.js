
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Wallet = require('../models/walletModel')
const asyncHandler = require('express-async-handler')
const { sendOtp, generateOTP } = require('../utility/nodeMailer')
const { forgetPassMail } = require('../utility/forgetPassMail')
const { isValidQueryId } = require('../middlewares/idValidation')
const crypto = require('crypto')
const bcrypt = require('bcrypt')
const Review = require("../models/reviewModel");
const WalletTransaction=require('../models/walletTransactionModel')
const shuffleArray = require("../utility/shuffleProducts");
// loadLandingPage---
const loadLandingPage = asyncHandler(async (req, res) => {
    try {
        const products = await Product.find({ isListed: true }).populate('images')
      shuffleArray(products);

        console.log("home page")
        res.render('./shop/pages/index',{products:products})
    } catch (error) {
        throw new Error(error)
    }

})
// loading register page---
const loadRegister = async (req, res) => {
    try {
        res.render('./shop/pages/register')
    } catch (error) {
        throw new Error(error)
    }
}

// inserting User-- 
const insertUser = async (req, res) => {
    try {
        const emailCheck = req.body.email;
        const checkData = await User.findOne({ email: emailCheck });
        if (checkData) {
            return res.render('./shop/pages/register', { userCheck: "User already exists, please try with a new email" });
        } else {
            const UserData = {
                userName: req.body.userName,
                email: req.body.email,
                password: req.body.password,
            };

            const OTP = generateOTP() /** otp generating **/
            
            req.session.otpUser = { ...UserData, otp: OTP };
            console.log(req.session.otpUser.otp)
            // req.session.mail = req.body.email;  

            /***** otp sending ******/
            try {
                sendOtp(req.body.email, OTP, req.body.userName);
                return res.redirect('/sendOTP');
            } catch (error) {
                console.error('Error sending OTP:', error);
                return res.status(500).send('Error sending OTP');
            }
        }
    } catch (error) {
        throw new Error(error);
    }
}
/*************** OTP Section *******************/
// loadSentOTP page Loding--
const sendOTPpage = asyncHandler(async (req, res) => {
    try {
        const email = req.session.otpUser.email
        res.render('./shop/pages/verifyOTP', { email })
    } catch (error) {
        throw new Error(error)
    }

})

// verifyOTP route handler

const verifyOTP = asyncHandler(async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        const email = req.session.otpUser.email;
        const storedOTP = req.session.otpUser.otp;
        const expirationTime = req.session.otpUser.expirationTime;
        const currentTime = new Date();

        if (currentTime > expirationTime) {
            // OTP has expired
            const messages = 'OTP has expired. Please resend it.';
            console.log('verification failed');

            res.render('./users/pages/verifyOTP', { messages, email });
        } else if (enteredOTP == storedOTP) {
            // OTP is correct and not expired
            const newUser = await User.create(req.session.otpUser);

            delete req.session.otpUser.otp;
            delete req.session.otpUser.expirationTime; // Clear the expiration time

            return res.redirect('/login');
        } else {
            // OTP is incorrect
            const messages = 'Verification failed, please check the OTP or resend it.';
            console.log('verification failed');

            res.render('./shop/pages/verifyOTP', { messages, email });
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**********************************************/

// Resending OTP---
const reSendOTP = async (req, res) => {
    try {
        const OTP = generateOTP() /** otp generating **/
        req.session.otpUser.otp = { otp: OTP };
        console.log( req.session.otpUser.otp)

        const email = req.session.otpUser.email
        const userName = req.session.otpUser.userName


        /***** otp resending ******/
        try {
            sendOtp(email, OTP, userName);
            console.log('otp is sent');
            return res.render('./shop/pages/reSendOTP', { email });
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).send('Error sending OTP');
        }

    } catch (error) {
        throw new Error(error)
    }
}

// verify resendOTP--
const verifyResendOTP = asyncHandler(async (req, res) => {
    try {
        const enteredOTP = req.body.otp;
        console.log(enteredOTP);
        const storedOTP = req.session.otpUser.otp;
        console.log(storedOTP);

        const user = req.session.otpUser;

        if (enteredOTP == storedOTP.otp) {
            console.log('inside verification');
            const newUser = await User.create(user);
            if (newUser) {
                console.log('new user insert in resend page', newUser);
            } else { console.log('error in insert user') }
            delete req.session.otpUser.otp;
            res.redirect('/login');
        } else {
            console.log('verification failed');
        }
    } catch (error) {
        throw new Error(error);
    }
});


// loading Login Page---
const loadLogin = async (req, res) => {
    try {
        
        res.render('./shop/pages/login')
    } catch (error) {
        throw new Error(error)
    }
}

// forgetPassword_ email inputPage--
const forgotPasswordpage = asyncHandler(async (req, res) => {
    try {
        res.render('./shop/pages/forgetPassEmail')
    } catch (error) {
        throw new Error(error)
    }
})

// sendEmail to reset password--
const sendResetLink = asyncHandler(async (req, res) => {
    try {
        console.log('use', req.body.email);
        const email = req.body.email;
        const user = await User.findOne({ email: email });

        if (!user) {
            req.flash('danger', `User Not found for this ${email}`)
            res.redirect("/forgetPassword");

        }

        const resetToken = await user.createResetPasswordToken();
        await user.save();

        const resetUrl = `${req.protocol}://${req.get("host")}/resetPassword/${resetToken}`;
        console.log('resetUrl', resetUrl);

        try {
            forgetPassMail(email, resetUrl, user.userName);
            req.flash('info', `Reset Link sent to this ${email}`)
            res.redirect("/forgetPassword");

        } catch (error) {
            user.passwordResetToken = undefined;
            user.passwordResetTokenExpires = undefined;
            console.error(error);
            console.log("There was an error sending the password reset email, please try again later");

            req.flash('Warning', 'Error in sending Email')
            return res.redirect("/forgetPassword");
        }

    } catch (error) {
        throw new Error(error)
    }
})

// Reset Password page GET
const resetPassPage = asyncHandler(async (req, res) => {
    try {

        const token = crypto.createHash("sha256").update(req.params.token).digest("hex");
        const user = await User.findOne({ passwordResetToken: token, passwordResetTokenExpires: { $gt: Date.now() } });

        if (!user) {
            req.flash('warning', 'Token expired or Invalid')
            res.redirect("/forgetPassword");
        }

        res.render("./shop/pages/resetPassword", { token });

    } catch (error) {
        throw new Error(error)
    }
})

// Resetting the password-- POST
const resetPassword = asyncHandler(async (req, res) => {

    const token = req.params.token;
    try {
        const user = await User.findOne({ passwordResetToken: token, passwordResetTokenExpires: { $gt: Date.now() } });

        if (!user) {

            req.flash('warning', 'Token expired or Invalid')
            res.redirect("/forgetPassword");
        }
        const salt = bcrypt.genSaltSync(10);
        hashedPassword = await bcrypt.hash(req.body.password, salt);

        user.password = hashedPassword;
        user.passwordResetToken = null;
        user.passwordResetTokenExpires = null;
        user.passwordChangedAt = Date.now();

        await user.save();

        console.log('password vhange', user.password)
        req.flash("success", "Password changed");
        res.redirect("/login");

    } catch (error) {
        throw new Error(error)
    }
})



// UserLogout----
const userLogout = async (req, res) => {
    try {
        req.logout(function (err) {

            if (err) {
                next(err);
            }
        })
        res.redirect('/')
    } catch (error) {
        console.log(error.message);
    }
}

// userProfile---
const userProfile = async (req, res) => {
    try {
        const user = req.user;
        console.log(user);
        const wallet = await Wallet.findOne({ user: user._id });
        res.render('./shop/pages/profile',{user,wallet})
    } catch (error) {
        console.log(error.message);
    }
}






// Shopping Page--
const shopping = asyncHandler(async (req, res) => {
    console.log('request from unauth user ');
    try {
        const user = req.user;
        const page = req.query.p || 1;
        const limit = 3;

        const listedCategories = await Category.find({ isListed: true });
        const categoryMapping = {};

        listedCategories.forEach(category => {
            categoryMapping[category.categoryName] = category._id;
        });

        const filter = { isListed: true };
       
        let cat = '6521056a158326ec6474a2ea'

        if (req.query.category) {
            // Check if the category name exists in the mapping
            if (categoryMapping.hasOwnProperty(req.query.category)) {
                filter.categoryName = categoryMapping[req.query.category];
            } else {
                filter.categoryName = cat
            }
        }
 // Check if a search query is provided
    if (req.query.search) {
    filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
       
    ];
    // if search and category both included in the query parameters 
    if (req.query.search && req.query.category) {
        if (categoryMapping.hasOwnProperty(req.query.category)) {
            filter.categoryName = categoryMapping[req.query.category];
        } else {
            filter.categoryName = cat
        }
    }
    }

     let sortCriteria = {};

        // Check for price sorting
        if (req.query.sort === 'lowtoHigh') {
            sortCriteria.salePrice = 1;
        } else if (req.query.sort === 'highToLow') {
            sortCriteria.salePrice = -1;
        }
        //filter by both category and price
        if (req.query.category && req.query.sort) {
            if (categoryMapping.hasOwnProperty(req.query.category)) {
                filter.categoryName = categoryMapping[req.query.category];
            } else {
                filter.categoryName = cat
            }

            if (req.query.sort) {
                sortCriteria.salePrice = 1;
            }
            if (req.query.sort === 'highToLow') {
                sortCriteria.salePrice = -1;
            }
        }
            //filter by both category and price
        if (req.query.category && req.query.sort) {
         if (categoryMapping.hasOwnProperty(req.query.category)) {
        filter.categoryName = categoryMapping[req.query.category];
            } else {
        filter.categoryName = cat
         }

        if (req.query.sort) {
        sortCriteria.salePrice = 1;
         }
        if (req.query.sort === 'highToLow') {
        sortCriteria.salePrice = -1;
     }
        }


        const findProducts = await Product.find(filter).populate('images')
            .skip((page - 1) * limit)
            .limit(limit)
            .sort(sortCriteria);
            
            let userWishlist;
            let cartProductIds;
        if (user) {
            if (user.cart || user.wishlist) {
                cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
                userWishlist = user.wishlist;
             }

        } else {
            cartProductIds = null;
            userWishlist = false;
        }

        const count = await Product.find(filter)
            // { categoryName: { $in: listedCategoryIds }, isListed: true })
            .countDocuments();
            let selectedCategory = [];
            if (filter.categoryName) {
                selectedCategory.push(filter.categoryName)
            }
            console.log('selected cat',selectedCategory);
    

        res.render('./shop/pages/shopping', {
            products: findProducts,
            category: listedCategories,
            cartProductIds,
            user,
            userWishlist,
            currentPage: page,
            totalPages: Math.ceil(count / limit), // Calculating total pages
            selectedCategory
         });
    } catch (error) {
        throw new Error(error);
    }
});



// view Product Page--
const viewProduct = asyncHandler(async (req, res) => {
    try {
        const id = req.params.id
        const user = req.user
       
        const findProduct = await Product.findOne({ _id: id }).populate('categoryName').populate('images').exec()
        const reviews = await Review.find({ product: id }).populate("user");


        let totalRating = 0;
        let avgRating = 0;

        if (reviews.length > 0) {
            for (const review of reviews) {
                totalRating += Math.ceil(parseFloat(review.rating));
            }
            const averageRating = totalRating / reviews.length;
            avgRating = averageRating.toFixed(2);

        } else {
            avgRating = 0;
        }

        if (!findProduct) {
            return res.status(404).render('./shop/pages/page404')
        }

        const products = await Product.find({ isListed: true }).populate('images').limit(3)

        let cartProductIds;
        if (user) {
         cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
        } else {
            cartProductIds = null;

        }

        let wishlist = false
        if (user) {
            wishlist = user.wishlist;
        }
        res.render('./shop/pages/productDetail', { product: findProduct, products: products ,cartProductIds, wishlist, reviews,
            avgRating,})
    } 
    catch (error) {
        throw new Error(error)
    }
})




// contact page--
const contact = asyncHandler(async (req, res) => {
    try {
        res.render('./shop/pages/contact')
    } catch (error) {
        throw new Error(error)
    }
})

// About Us----
const aboutUs = asyncHandler(async (req, res) => {
    try {
        res.render('./shop/pages/aboutus')
    } catch (error) {
        throw new Error(error)
    }
})



const addReview = asyncHandler(async (req, res) => {
    try {
        const productId = req.params.id;
        const userId = req.user._id;

        const existingReview = await Review.findOne({ user: userId, product: productId });

        if (existingReview) {
            existingReview.review = req.body.review;
            existingReview.rating = req.body.rating;
            console.log(req.body.rating)
            await existingReview.save();
        } else {
            const newReview = await Review.create({
                user: userId,
                product: productId,
                review: req.body.review,
                rating: req.body.rating,
            });
        }
        res.redirect("back");
    } catch (error) {
        throw new Error(error);
    }
});



const walletTransactionspage = asyncHandler(async (req, res) => {
    try {
        const walletId = req.params.id;
        const walletTransactions = await WalletTransaction.find({ wallet: walletId }).sort({ timestamp: -1 });
        res.render("shop/pages/walletTransaction", {
            title: "Wallet Transactions",
            page: "Wallet-Transactions",
            walletTransactions,
        });
    } catch (error) {
        throw new Error(error);
    }
});


//search products


//search
// const search =asyncHandler( async (req, res) => {
//     console.log(req.body.search);
//     try {
//         const data = req.body.search;
//         const user = req.user;
//         const page = req.query.p || 1;
//         const limit = 3;
//         const listedCategories = await Category.find({ isListed: true });
//         // Get the IDs of the listed categories
//         const listedCategoryIds = listedCategories.map(category => category._id);
        
//         const searching = await Product.find({ title: { $regex: data, $options: 'i' } }).populate('images')
//         .skip((page - 1) * limit)
//         .limit(limit);
//         console.log(user);
//         const count = await Product.find(
//             { categoryName: { $in: listedCategoryIds }, isListed: true })
//             .countDocuments();
//             let cartProductIds;
//             let userWishlist;
//             if (user) {
//                 if (user.cart||user.wishlist) {
//                     cartProductIds = user.cart.map(cartItem => cartItem.product.toString());
//                     userWishlist = user.wishlist;
//                 }
    
//             } else {
//                 cartProductIds = null;
    
//             }
            
//         if (searching.length>0) {
//             res.render('./shop/pages/shopping', { user, userWishlist,cartProductIds, catList: searching ,products:searching, category: listedCategories,currentPage: page,
//             totalPages: Math.ceil(count / limit)
//            })

//         } else {
//             res.render('./shop/pages/shopping', { user, cartProductIds, catList: searching ,products:searching, category: listedCategories,currentPage: page,
//                 totalPages: Math.ceil(count / limit)
//                })
//         }

//     } catch (error) {
//         console.log(error.message);
//     }
// })

const wishlist = asyncHandler(async (req, res) => {
    try {
        const user = req.user
        const userWishlist = await User.findById({ _id: user.id }).populate({
            path: 'wishlist',
            populate: {
                path: 'images',
            },
        });
        console.log('dsfs', userWishlist.wishlist);
        res.render('./shop/pages/wishlist', { wishlist: userWishlist.wishlist ,})
    } catch (error) {
        throw new Error(error)
    }
})

// add to wishlist --
const addTowishlist = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id
        // checking if the product already existing in the wishlist
        const user = await User.findById(userId);
        if (user.wishlist.includes(productId)) {
            console.log('product found');
            await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } })
            return res.json({ success: false, message: 'Product removed from wishlist' });
        }

        await User.findByIdAndUpdate(userId, { $push: { wishlist: productId } })
        res.json({ success: true, message: 'Product Added to wishlist' })
    } catch (error) {
        throw new Error(error)
    }
})

// Remove item from wishlist
const removeItemfromWishlist = asyncHandler(async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id
        await User.findByIdAndUpdate(userId, { $pull: { wishlist: productId } })
        res.redirect('/wishlist')
    } catch (error) {
        throw new Error(error)
    }
})




module.exports = {
    loadLandingPage,
    loadRegister,
    insertUser,
    sendOTPpage,
    verifyOTP,
    reSendOTP,
    verifyResendOTP,
    loadLogin,
    userLogout,
    userProfile,
    shopping,
    viewProduct,
    contact,
    aboutUs,
    // categoryPage,
    walletTransactionspage,
    addReview,
    // search,
    removeItemfromWishlist,
    addTowishlist,
    wishlist,
    forgotPasswordpage,
    sendResetLink,
    resetPassPage,
    resetPassword
}







