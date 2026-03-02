import customerModel from "./customerModel";
import { Customer } from "./customerTypes";

class CustomerService {
  async findOrCreateCustomer(userPayload: Customer) {
    const { userId, firstName, lastName, email } = userPayload;

    let customer = await customerModel.findOne({ userId });

    if (!customer) {
      customer = await customerModel.create({
        userId,
        firstName,
        lastName,
        email,
        addresses: [],
      });
    }

    return customer;
  }

  async addAddress(
    customerId: string,
    userId: string,
    addressText: string,
    isDefault: boolean,
  ) {
    // If this is default address, then first reset all others
    if (isDefault) {
      await customerModel.updateOne(
        { _id: customerId, userId },
        {
          $set: { "addresses.$[].isDefault": false }, // set all addresses non-default
        },
      );
    }

    return customerModel.findOneAndUpdate(
      { _id: customerId, userId },
      {
        $push: {
          addresses: {
            text: addressText,
            isDefault: isDefault,
          },
        },
      },
      { new: true },
    );
  }
}

export default new CustomerService();
