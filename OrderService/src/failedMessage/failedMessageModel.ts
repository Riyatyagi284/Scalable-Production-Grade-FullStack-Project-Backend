import mongoose, { Schema, Document } from "mongoose";
import { FailedOrderMessage } from "../types/FailedMessageOrder";

export interface FailedMessage extends Document {
  topic: string;
  message: FailedOrderMessage; // stored as JSON
  retryCount: number;
  lastAttempt: Date;
  status: "pending" | "processing" | "failed" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const FailedMessageSchema = new Schema<FailedMessage>(
  {
    topic: {
      type: String,
      required: true,
      index: true,
    },

    message: {
      type: Schema.Types.Mixed, // allows JSON object
      required: true,
    },

    retryCount: {
      type: Number,
      default: 0,
    },

    lastAttempt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["pending", "processing", "failed", "completed"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true, 
  }
);

export const failedMessagesModel =
  mongoose.models.FailedMessage ||
  mongoose.model<FailedMessage>("FailedMessage", FailedMessageSchema);
