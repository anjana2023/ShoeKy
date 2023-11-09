const mongoose = require('mongoose');

var ProductSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,

    },
    description: {
        type: String,
        required: true,

    },
    productPrice: {
        type: Number,
        required: true,
        min: 0
    },
    salePrice: {
        type: Number,
        required: true,
        min: 0
    },
    categoryName: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    brand: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    sold: {
        type: Number,
        default: 0,
        
    },
    images: [{ type: mongoose.Schema.Types.ObjectId, ref: "Images" }],
    color: {
        type: String,
        required: true
    },
    ratings: [{
        star: Number,
        postedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    totalrating: {
        type: String,
        default: 0,
    },
    isListed: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Export the model
module.exports = mongoose.model('Product', ProductSchema);