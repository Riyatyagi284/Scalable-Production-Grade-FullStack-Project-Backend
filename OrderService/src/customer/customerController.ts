import { Response } from "express";
import { Request } from "express-jwt";
import customerService from "./customerService";
import logger from "../config/logger";

export class CustomerController {
  getCustomer = async (req: Request, res: Response) => {
    try {
      const { sub: userId, firstName, lastName, email } = req.auth;

      if (!userId || !email) {
        return res
          .status(400)
          .json({ message: "Invalid authentication payload." });
      }

      const customer = await customerService.findOrCreateCustomer({
        userId,
        firstName,
        lastName,
        email,
        addresses: [],
        createdAt: undefined,
        updatedAt: undefined,
      });

      logger.info("Customer fetched successfully", {
        customerId: customer._id,
        userId: customer.userId,
      });

      return res.status(200).json(customer);
    } catch (error) {
      logger.error("Error in getCustomer", { error });
      return res.status(500).json({ message: "Internal server error." });
    }
  };

  addAddress = async (req: Request, res: Response) => {
    try {
      const { sub: userId } = req.auth || {};
      const { id } = req.params;
      const { address, isDefault } = req.body;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized user." });
      }

      if (!id) {
        return res.status(400).json({ message: "Customer ID is required." });
      }

      if (!address || address.trim().length === 0) {
        return res.status(400).json({ message: "Address cannot be empty." });
      }

      if (isDefault !== undefined && typeof isDefault !== "boolean") {
        return res.status(400).json({ message: "isDefault must be boolean." });
      }

      const updatedCustomer = await customerService.addAddress(
        id,
        userId,
        address,
        isDefault ?? false,
      );

      if (!updatedCustomer) {
        return res
          .status(404)
          .json({ message: "Customer not found or not owned by user." });
      }

      logger.info("Address added successfully", {
        userId,
        customerId: id,
        newAddress: address,
      });

      return res.status(200).json(updatedCustomer);
    } catch (err) {
      logger.error("ADD ADDRESS ERROR", { error: err });
      return res.status(500).json({ message: "Internal server error." });
    }
  };
}
