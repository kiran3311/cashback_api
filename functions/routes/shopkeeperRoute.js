

const express = require("express");
const router = express.Router();
const multer = require("multer");

const { addCustomer , createShop,getShopsByUserId ,getNearbyShops, createOffer, getOffersByShopkeeperId, getAllOffers, uploadShopImage, getCustomersByShopkeeper, updateCashbackToExistingCustomer, addCashbackToExistingCustomer, redeemCashbackToExistingCustomer, updateRedeemStatus} = require("../controller/shopkepperController")

const uploadShopImageFile = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 5 * 1024 * 1024 },
	fileFilter: (req, file, callback) => {
		const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
		callback(allowedTypes.includes(file.mimetype) ? null : new Error("Only JPG, PNG, WEBP, and GIF images are allowed"), allowedTypes.includes(file.mimetype));
	}
}).single("image");

const handleShopImageUpload = (req, res, next) => {
	uploadShopImageFile(req, res, error => {
		if (error) {
			return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: error.message });
		}
		next();
	});
};

router.post("/adduserToShop", addCustomer );
router.post("/createShop", createShop );
router.post("/getShopsByUserId", getShopsByUserId );
router.post("/getNearbyShops", getNearbyShops );
router.post("/uploadShopImage", handleShopImageUpload, uploadShopImage );
router.post("/createOffer", createOffer );
router.post("/getOffersByShopkeeperId", getOffersByShopkeeperId );
router.post("/getAllOffers", getAllOffers );
router.post("/getCustomerListByShopkeeperId", getCustomersByShopkeeper );
router.post("/updateCashbackToExistingCustomer", updateCashbackToExistingCustomer );
router.post("/addCashbackToExistingCustomer", addCashbackToExistingCustomer );
router.post("/redeemCashback", redeemCashbackToExistingCustomer );
router.post("/updateRedeemStatus", updateRedeemStatus );


module.exports = router;
