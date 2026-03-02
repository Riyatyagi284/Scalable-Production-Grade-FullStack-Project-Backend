import mongoose from "mongoose";

export interface Address {
  text: string;
  isDefault: boolean;
}

export interface Customer {
  _id?: mongoose.Types.ObjectId;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}
