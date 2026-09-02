const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const Listing = require("../models/listing.js");
const express = require("express");

const router = express.Router({ mergeParams: true });

const { reviewSchema } = require("../schema.js");
const Reviews = require("../models/review.js");

const vallidateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

//POST REVIEW ROUTE
router.post(
  "/",
  vallidateReview,
  wrapAsync(async (req, res) => {
    let { id } = req.params;

    let listing = await Listing.findById(id);

    if (!listing) {
      throw new ExpressError(404, "Listing not found");
    }

    let newReview = new Reviews(req.body.review);

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
    req.flash("success", "New review added !");
    res.redirect(`/listings/${listing._id}`);
  }),
);

//DELETE REVIEW ROUTE
router.delete(
  "/:reviewId",
  wrapAsync(async (req, res) => {
    let { id, reviewId } = req.params;

    const mongoose = require("mongoose");

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      throw new ExpressError(400, "Invalid ID");
    }

    await Listing.findByIdAndUpdate(id, {
      $pull: { reviews: reviewId },
    });

    await Reviews.findByIdAndDelete(reviewId);
    req.flash("success", "Review Deleted !");
    res.redirect(`/listings/${id}`);
  }),
);

module.exports = router;
