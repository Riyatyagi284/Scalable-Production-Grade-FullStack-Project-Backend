import { checkSchema } from "express-validator";

export const orderSchema = checkSchema({
  cart: {
    in: ["body"],
    isArray: {
      options: { min: 1 },
      errorMessage: "cart must be a non-empty array",
    },
  },
  "cart.*.name": {
    in: ["body"],
    isString: { errorMessage: "name must be a string" },
  },
  "cart.*.image": {
    in: ["body"],
    isURL: { errorMessage: "image must be a valid URL" },
  },
  "cart.*.qty": {
    in: ["body"],
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: "qty must be between 1 and 100",
    },
  },
  // price configuration
  "cart.*.priceConfiguration": {
    in: ["body"],
    isObject: {
      errorMessage: "priceConfiguration is required and must be an object/map",
    },
  },

  "cart.*.priceConfiguration.*.priceType": {
    in: ["body"],
    isString: { errorMessage: "priceType is required" },
    isIn: {
      options: [["base", "aditional"]],
      errorMessage: "priceType must be 'base' or 'aditional'",
    },
  },
  "cart.*.priceConfiguration.*.availableOptions": {
    in: ["body"],
    isObject: {
      errorMessage: "availableOptions must be an object/map",
    },
  },

  "cart.*.priceConfiguration.*.availableOptions.*": {
    in: ["body"],
    isNumeric: {
      errorMessage: "availableOptions values must be numbers",
    },
  },
  // chosen configuration
  "cart.*.chosenConfiguration": {
    in: ["body"],
    isObject: {
      errorMessage: "chosenConfiguration is required and must be an object",
    },
  },
  "cart.*.chosenConfiguration.priceConfiguration.*": {
    in: ["body"],
    isString: {
      errorMessage: "chosen priceConfiguration values must be strings",
    },
  },
  "cart.*.chosenConfiguration.selectedToppings": {
    in: ["body"],
    isArray: {
      options: { min: 0 },
      errorMessage: "selectedToppings must be an array",
    },
  },
  "cart.*.chosenConfiguration.selectedToppings.*.id": {
    in: ["body"],
    isMongoId: { errorMessage: "Topping id must be a valid ObjectId" },
  },
  // "cart.*.chosenConfiguration.selectedToppings.*.image": {
  //   in: ["body"],
  //   isURL: { errorMessage: "Topping image must be a valid URL" },
  // },

  "cart.*.chosenConfiguration.selectedToppings.*.name": {
    in: ["body"],
    isString: { errorMessage: "Topping name must be string" },
  },
  "cart.*.chosenConfiguration.selectedToppings.*.price": {
    in: ["body"],
    isNumeric: { errorMessage: "Topping price must be a number" },
  },

  total: {
    in: ["body"],
    isNumeric: {
      errorMessage: "total must be a number",
    },
    notEmpty: {
      errorMessage: "total is required",
    },
  },

  couponCode: {
    optional: true,
    isString: true,
  },
  tenantId: {
    in: ["body"],
    isString: { errorMessage: "tenantId is required" },
  },
  paymentMode: {
    in: ["body"],
    isIn: {
      options: [["card", "cash"]],
      errorMessage: "paymentMode must be one of Card OR Cash",
    },
  },

  customerId: {
    in: ["body"],
    isHexadecimal: { errorMessage: "customerId must be hex" },
    isLength: {
      options: { min: 24, max: 24 },
      errorMessage: "customerId must be 24 chars",
    },
  },
  comment: {
    optional: true,
    isLength: {
      options: { max: 500 },
      errorMessage: "comment must be at most 500 characters",
    },
  },
  address: {
    in: ["body"],
    isLength: {
      options: { min: 10, max: 500 },
      errorMessage: "address must be between 10 and 500 characters",
    },
  },
  paymentStatus: {
    optional: true,
    isIn: {
      options: [["pending", "paid", "failed"]],
      errorMessage: "Invalid paymentStatus",
    },
  },

  orderStatus: {
    optional: true,
    isIn: {
      options: [["pending", "confirmed", "delivered", "cancelled"]],
      errorMessage: "Invalid orderStatus",
    },
  },
});
