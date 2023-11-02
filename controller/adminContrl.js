const expressHandler = require('express-async-handler')
const User = require('../models/userModel') 
const validateMongoDbId = require("../utility/validateMongodbId");
const Order = require("../models/orderModel");
const Product = require("../models/productModel");
const OrderItem = require("../models/orderItemModel");
const Coupon = require("../models/couponModel");
const { status } = require("../utility/status");
const numeral = require("numeral");
const moment = require("moment");
const { handleReturnedOrder, handleCancelledOrder, updateOrderStatus } = require("../helpers/admin_orderHelper");
// Loading loginPage--   
const loadLogin = expressHandler(async(req,res)=>{

    try {
        res.render('./admin/pages/login',{title:'Login'})
    } catch (error) {
        throw new Error(error)
    }
})



// //verifyAdmin--
const verifyAdmin = expressHandler(async(req,res)=>{

    try {
      
        const email = process.env.ADMIN_EMAIL
        const password =   process.env.ADMIN_PASSWORD
          
            const emailCheck = req.body.email
           const user = await User.findOne({email:emailCheck})

            if(user){
                     res.render('./admin/pages/login',{adminCheck:'You are not an Admin',title:'Login'})
            }
         if(email === email && req.body.password === password){
              
              req.session.admin = email; 
            res.render('./admin/pages/index',{title:'dashboard'})
         }else{
            res.render('./admin/pages/login', {adminCheck: 'Invalid Credentials',title:'Login'})
         }

    } catch (error) {
        throw new Error(error)
    }
}) 


// loadDashboard---  
const loadDashboard = expressHandler(async(req,res)=>{
   try {
    const messages = req.flash();
    const user = req?.user;
    const recentOrders = await Order.find()
        .limit(5)
        .populate({
            path: "user",
            select: "firstName lastName image",
        })
        .populate("orderItems")
        .select("totalAmount orderedDate totalPrice")
        .sort({ _id: -1 });

    //
    let totalSalesAmount = recentOrders.reduce((total, order) => {
        const nonCancelledItems = order.orderItems.filter(
            (item) => item.status === status.delivered || item.status === status.shipped
        );

        if (nonCancelledItems.length > 0) {
            const totalPrice = nonCancelledItems.reduce((acc, item) => {
                return acc + parseFloat(item.price);
            }, 0);
            return total + totalPrice;
        } else {
            return total;
        }
    }, 0);

    totalSalesAmount = numeral(totalSalesAmount).format("0.0a");

    const totalSoldProducts = await Product.aggregate([
        {
            $group: {
                _id: null,
                total_sold_count: {
                    $sum: "$sold",
                },
            },
        },
    ]);

    const totalOrderCount = await Order.countDocuments();
    const totalActiveUserCount = await User.countDocuments({ isBlocked: false });

    res.render('./admin/pages/index', {
        title: "Dashboard",
        user,
        messages,
        recentOrders,
        totalOrderCount,
        totalActiveUserCount,
        totalSalesAmount,
        moment,
        totalSoldProducts: totalSoldProducts[0].total_sold_count,
    });
} catch (error) {
    throw new Error(error);
}
});




// UserManagement-- 
const userManagement = expressHandler(async(req,res)=>{

    try {
     
        const findUsers = await User.find();
            
        res.render('./admin/pages/userList',{users:findUsers,title:'UserList'})
    } catch (error) {
        throw new Error(error) 
    }
}) 
// searchUser
const searchUser = expressHandler(async(req,res)=>{

    try {
     
        const  data = req.body.search
        const searching = await User.find({userName:{$regex: data , $options: 'i' }});
        if(searching){
             res.render('./admin/pages/userList',{users:searching,title:'Search'})
        }else{
            res.render('./admin/pages/userList',{title:'Search'})
        }
            
       
    } catch (error) {
        throw new Error(error) 
    }
}) 
// Block a User

const blockUser = expressHandler(async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndUpdate(id, { isBlock: true }, { new: true });

        if (user) {
            // Send a JSON response indicating success
            res.json({ message: "User blocked successfully" });
        } else {
            // Handle the case where the user was not found or not updated
            res.status(404).json({ message: "User not found or could not be updated" });
        }
    } catch (error) {
        // Handle any errors that occurred during the update
        res.status(500).json({ message: "Error while blocking the user" });
    }
});


// Unblock a User
const unBlockUser = expressHandler(async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findByIdAndUpdate(id, { isBlock: false }, { new: true });

        if (user) {
            // Send a JSON response indicating success
            res.json({ message: "User unblocked successfully" });
        } else {
            // Handle the case where the user was not found or not updated
            res.status(404).json({ message: "User not found or could not be updated" });
        }
    } catch (error) {
        // Handle any errors that occurred during the update
        res.status(500).json({ message: "Error while unblocking the user" });
    }
});

// Admin Logout--
const logout = (req, res)=>{
    try {
        req.session.admin = null;
        res.redirect('/admin')
    } catch (error) {
        throw new Error(error)
    }
}


 const ordersPage = expressHandler(async (req, res) => {
    try {
        const orders = await Order.find()
            .populate({
                path: "orderItems",
                select: "product status _id",
                populate: {
                    path: "product",
                    select: "title images",
                    populate: {
                        path: "images",
                    },
                },
            })
            .select("orderId orderedDate shippingAddress city zip totalPrice")
            .sort({ orderedDate: -1 });
        // res.json(orders);
        res.render("admin/pages/orders", { title: "Orders", orders });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Edit Order Page Route
 * Method GET
 */
const editOrder = expressHandler(async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findOne({ orderId: orderId })
            .populate({
                path: "orderItems",
                modal: "OrderItems",
                populate: {
                    path: "product",
                    modal: "Product",
                    populate: {
                        path: "images",
                        modal: "Images",
                    },
                },
            })
            .populate({
                path: "user",
                modal: "User",
            });
        res.render("admin/pages/editOrder", { title: "Edit Order", order });
    } catch (error) {
        throw new Error(error);
    }
});
 
/** 
 * Update Order Status
 * Method PUT
 */
const updateOrderStatuss = expressHandler(async (req, res) => {
    try {
        const orderId = req.params.id;

console.log(orderId)
console.log(req.body.status)
console.log(status)
const newStatus = req.body.status
        // const order = await updateOrderStatus(orderId, req.body.status);\
        const order = await OrderItem.findByIdAndUpdate(orderId, { status: newStatus })
        if (req.body.status === status.shipped) {
            order.shippedDate = Date.now();
        } else if (req.body.status === status.delivered) {
            order.deliveredDate = Date.now();
        }
        console.log("2")
        await order.save();

        if (req.body.status === status.cancelled) {
            await handleCancelledOrder(order);
        }
    
        if (order.status === status.returnPending) {
            await handleReturnedOrder(order);
        }

        res.redirect("back");
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Search Order
 * Method POST
 */
const searchOrder = expressHandler(async (req, res) => {
    try {
        const search = req.body.search;
        const order = await Order.findOne({ orderId: search });
        if (order) {
            res.redirect(`/admin/orders/${search}`);
        } else {
            req.flash("danger", "Can't find Order!");
            res.redirect("/admin/dashboard");
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Manage Coupon Page Route
 * Method GET
 */
const couponspage = expressHandler(async (req, res) => {
    try {
        const messages = req.flash();
        const coupons = await Coupon.find().sort({ _id: 1 });
        res.render("admin/pages/coupons", { title: "Coupons", coupons, messages });
    } catch (error) {
        throw new Error(error);
    }
});
/**
 * Add Coupon Page Route
 * Method GET
 */
 const addCoupon = expressHandler(async (req, res) => {
    try {
        const messages = req.flash();
        res.render("admin/pages/addCoupon", { title: "Add Coupon", messages, data: {} });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Create Coupon
 * Method POST
 */
const createCoupon = expressHandler(async (req, res) => {
    try {
        const existingCoupon = await Coupon.findOne({ code: req.body.code });

        console.log(req.body);

        if (!existingCoupon) {
            const newCoupon = await Coupon.create({
                code: req.body.code,
                type: req.body.type,
                value: parseInt(req.body.value),
                description: req.body.description,
                expiryDate: req.body.expiryDate,
                minAmount: parseInt(req.body.minAmount),
                maxAmount: parseInt(req.body.maxAmount) || 0,
            });
            res.redirect("/admin/coupons");
        }
        req.flash("warning", "Coupon exists with same code");
        res.render("admin/pages/addCoupon", { title: "Add Coupon", messages, data: req.body });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Edit Coupon page
 * Method GET
 */
const editCouponPage = expressHandler(async (req, res) => {
    try {
        const couponId = req.params.id;
        const coupon = await Coupon.findById(couponId);
        const couponTypes = await Coupon.distinct("type");
        const messages = req.flash();
        res.render("admin/pages/editCoupon", { title: "Edit Coupon", coupon, couponTypes, messages });
    } catch (error) {
        throw new Error(error);
    }
});
/**
 * Update Coupon
 * Method POST
 */
const updateCoupon = expressHandler(async (req, res) => {
    try {
        const couponId = req.params.id;
        const isExists = await Coupon.findOne({ code: req.body.code, _id: { $ne: couponId } });

        if (!isExists) {
            const updtedCoupon = await Coupon.findByIdAndUpdate(couponId, req.body);
            req.flash("success", "Coupon Updated");
            res.redirect("/admin/coupons");
        } else {
            req.flash("warning", "Coupon Already Exists");
            res.redirect("back");
        }
    } catch (error) {}
});


/**
 * Customers Page Route
 * Method GET
 */
const customerpage = expressHandler(async (req, res) => {
    try {
        const messages = req.flash();
        const customers = await User.find({ role: roles.user });
        res.render("admin/pages/customers", { title: "Customer", customers, messages, roles });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * View a Customer Page Route
 * Method GET
 */
const viewCustomer = expressHandler(async (req, res) => {
    try {
        const messages = req.flash();
        const id = req.params.id;
        validateMongoDbId(id);
        const customer = await User.findById(id);
        res.render("admin/pages/ccustomer", { title: "Customer", customer, messages });
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Block Customer
 * Method PUT
 */
const blockCustomer = expressHandler(async (req, res) => {
    const id = req.params.id;
    validateMongoDbId(id);
    try {
        const blockedCustomer = await User.findByIdAndUpdate(
            id,
            {
                isBlocked: true,
            },
            {
                new: true,
            }
        );
        if (blockedCustomer) {
            req.flash("success", `${blockedCustomer.email} Blocked Successfully`);
            res.redirect("/admin/customers");
        } else {
            req.flash("danger", `Can't block ${blockedCustomer}`);
            res.redirect("/admin/customers");
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Unblock Customer
 * Method PUT
 */
const unblockCustomer = expressHandler(async (req, res) => {
    const id = req.params.id;
    validateMongoDbId(id);
    try {
        const unblockCustomer = await User.findByIdAndUpdate(
            id,
            {
                isBlocked: false,
            },
            {
                new: true,
            }
        );
        if (unblockCustomer) {
            req.flash("success", `${unblockCustomer.email} Unblocked Successfully`);
            res.redirect("/admin/customers");
        } else {
            req.flash("danger", `Can't Unblock ${unblockCustomer}`);
            res.redirect("/admin/customers");
        }
    } catch (error) {
        throw new Error(error);
    }
});

/**
 * Update Role
 * Method PUT
 */
const updateRole = expressHandler(async (req, res) => {
    const id = req.params.id;
    validateMongoDbId(id);
    try {
        if (req.user.role === roles.admin && req.body.role === roles.superAdmin) {
            req.flash("warning", "unauthorized, admin can't update user role to super admin");
            res.redirect("/admin/customers");
        } else {
            const updatedCustomer = await User.findByIdAndUpdate(
                id,
                {
                    role: req.body.role,
                },
                {
                    new: true,
                }
            );
            if (updatedCustomer) {
                req.flash("success", `${updatedCustomer.firstName} updated to ${updatedCustomer.role}`);
                res.redirect("/admin/customers");
            } else {
                req.flash("danger", `Can't Update the role`);
            }
        }
    } catch (error) {
        throw new Error(error);
    }
});





module.exports = {
    loadLogin,
    verifyAdmin,
    loadDashboard,
    userManagement,
    searchUser,
    blockUser,
    unBlockUser,
    logout,
    ordersPage,
    editOrder,
    updateOrderStatuss,
    searchOrder,
    couponspage,
    addCoupon,
    createCoupon,
    editCouponPage,
    updateCoupon,
    customerpage,
    updateRole,
    unblockCustomer,
    blockCustomer,
    viewCustomer,
    customerpage
}