const express = require("express");
const router = express.Router();
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const { isLoggedIn, isOwner } = require("../middleware.js");

const validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);

  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

// ================= INDEX + SEARCH ROUTE =================
// Index + Search + Filters Route
router.get(
  "/",
  wrapAsync(async (req, res) => {
    const search = req.query.search || "";
    const minPrice = req.query.minPrice || "";
    const maxPrice = req.query.maxPrice || "";
    const location = req.query.location || "";
    const sort = req.query.sort || "";
    const category = req.query.category || "";

    let filter = {};

    // Search filter
    if (search.trim() !== "") {
      filter.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { location: { $regex: search.trim(), $options: "i" } },
        { country: { $regex: search.trim(), $options: "i" } },
        { description: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      filter.price = {};

      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Location filter
    if (location.trim() !== "") {
      filter.location = {
        $regex: location.trim(),
        $options: "i",
      };
    }

    // Category filter
    if (category.trim() !== "") {
      filter.category = category.trim();
    }

    let query = Listing.find(filter);

    if (sort === "price_asc") {
      query = query.sort({ price: 1 });
    }

    if (sort === "price_desc") {
      query = query.sort({ price: -1 });
    }

    const allListings = await query;

    console.log("Search:", search);
    console.log("Min Price:", minPrice);
    console.log("Max Price:", maxPrice);
    console.log("Location:", location);
    console.log("Listings found:", allListings.length);

    res.render("listings/index.ejs", {
      allListings,
      search,
      minPrice,
      maxPrice,
      location,
      sort,
      category,
    });
  }),
);

// ================= NEW ROUTE =================

router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new.ejs");
});

// ================= SHOW ROUTE =================

router.get(
  "/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;

    const listing = await Listing.findById(id)
      .populate({
        path: "reviews",
        populate: {
          path: "author",
        },
      })
      .populate("owner");

    res.render("listings/show.ejs", { listing });
  }),
);

// ================= CREATE ROUTE =================

router.post(
  "/",
  isLoggedIn,
  validateListing,
  wrapAsync(async (req, res) => {
    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id;

    await newListing.save();

    req.flash("success", "New Listing Created!");

    res.redirect("/listings");
  }),
);

// ================= EDIT ROUTE =================

router.get(
  "/:id/edit",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    const listing = await Listing.findById(id);

    if (!listing) {
      req.flash("error", "Listing you requested for does not exist!");

      return res.redirect("/listings");
    }

    res.render("listings/edit.ejs", { listing });
  }),
);

// ================= UPDATE ROUTE =================

router.put(
  "/:id",
  isLoggedIn,
  isOwner,
  validateListing,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    if (typeof req.body.listing.image === "string") {
      req.body.listing.image = {
        url: req.body.listing.image,
        filename: "listingimage",
      };
    }

    if (!req.body.listing.image.url) {
      req.body.listing.image.url =
        "https://images.unsplash.com/photo-1625505826533-5c80aca7d157";
    }

    await Listing.findByIdAndUpdate(id, req.body.listing, {
      new: true,
      runValidators: true,
    });

    req.flash("success", "Listing updated successfully!");

    res.redirect(`/listings/${id}`);
  }),
);

// ================= DELETE ROUTE =================

router.delete(
  "/:id",
  isLoggedIn,
  isOwner,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    let deletedListing = await Listing.findByIdAndDelete(id);

    console.log(deletedListing);

    req.flash("success", "Listing Deleted");

    res.redirect("/listings");
  }),
);

module.exports = router;
