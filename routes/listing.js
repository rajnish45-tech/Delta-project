const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { listingSchema } = require("../schema.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const { isLoggedIn } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const multer = require('multer');
const {storage} = require("../cloudConfig.js");
const upload = multer({storage});

router
.route("/")
.get(wrapAsync(listingController.index))
.post(
    isLoggedIn,
    upload.single("listing[image]"),
    wrapAsync(listingController.createListing)
);


const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);

    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

// Check Listing Ownership
const isOwner = async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    if (
        !listing.owner ||
        !req.user ||
        !listing.owner.equals(req.user._id)
    ) {
        req.flash("error", "You don't have permission to perform this action");
        return res.redirect(`/listings/${id}`);
    }

    res.locals.listing = listing;
    next();
};


// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

// Show Route
router.get("/:id", wrapAsync(listingController.showListing));


// Edit Route
router.get("/:id/edit", isLoggedIn, wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    if (
        !listing.owner ||
        !req.user ||
        !listing.owner.equals(req.user._id)
    ) {
        req.flash("error", "You don't have permission to edit");
        return res.redirect(`/listings/${id}`);
    }

    res.render("listings/edit.ejs", { listing });
}));

// Update Route
router.put(
    "/:id",
    isLoggedIn,
    validateListing,
    wrapAsync(async (req, res) => {
        if (!req.body.listing) {
            throw new ExpressError(400, "send valid data for listings");
        }
        const { id } = req.params;
        const listing = await Listing.findById(id);
        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }
        if (
            !listing.owner ||
            !req.user ||
            !listing.owner.equals(req.user._id)
        ) {
            req.flash("error", "You don't have permission to edit");
            return res.redirect(`/listings/${id}`);
        }
        await Listing.findByIdAndUpdate(id, {
            ...req.body.listing
        });
        req.flash("success", "Listing Updated!");
        res.redirect(`/listings/${id}`);
    })
);

// Delete Route
router.delete(
    "/:id",
    isLoggedIn,
    wrapAsync(async (req, res) => {
        const { id } = req.params;
        const listing = await Listing.findById(id);

        if (!listing) {
            req.flash("error", "Listing you requested for does not exist!");
            return res.redirect("/listings");
        }

        if (
            !listing.owner ||
            !req.user ||
            !listing.owner.equals(req.user._id)
        ) {
            req.flash("error", "You don't have permission to delete");
            return res.redirect(`/listings/${id}`);
        }

        await Listing.findByIdAndDelete(id);

        req.flash("success", "Listing Deleted!");
        res.redirect("/listings");
    })
);

module.exports = router;