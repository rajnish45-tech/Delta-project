const Listing = require("../models/listing");
const mbxGeocoding = require('@mapbox/mapbox-sdk/services/tilesets');
const mapToken = process.env.MAP_TOKEN;
const geocodingClient = mbxGeocoding({accessToken: mapToken});


module.exports.index = async (req, res) => {
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", { allListings });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id)
        .populate("reviews")
        .populate("owner");

    if (!listing) {
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    res.render("listings/show.ejs", { listing });
};

module.exports.createListing = async (req, res) => {
    let response = await geocodingClient
    .forwardGeocode({
        query: req.body.listing.location,
        limit: 1, 
    })
    .send(); 
    

    let url = req.file.path;
    let filename = req.file.filename; 
    const newlisting = new Listing(req.body.listing);
    newlisting.owner = req.user._id;
    newlisting.image = {url, filename};

    newListing.geometry = response.body.features[0].geometry;

    let savedListing = await newListing.save();
    console.log(savedListing);
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};