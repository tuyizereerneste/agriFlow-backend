import Joi from "joi";

export const createFarmerSchema = Joi.object({
  farmer: Joi.object({
    names: Joi.string().min(2).required().messages({
      "string.empty": "Names cannot be empty",
      "string.min": "Names must be at least 2 characters long",
    }),
    province: Joi.string().required(),
    district: Joi.string().required(),
    sector: Joi.string().required(),
    cell: Joi.string().required(),
    village: Joi.string().required(),
    phones: Joi.array()
    .items(Joi.string().pattern(/^\+250\d{9}$/).messages({
      "string.pattern.base": "Invalid phone number",
    })).required(),
    dob: Joi.string().required(),
    gender: Joi.string().valid('Male', 'Female').required(),
  }).required(),
  partner: Joi.object({
    name: Joi.string().required(),
    phones: Joi.array()
    .items(Joi.string().pattern(/^\+250\d{9}$/).messages({
      "string.pattern.base": "Invalid phone number",
    })).required(),
    dob: Joi.string().required(),
    gender: Joi.string().valid('Male', 'Female').required(),
  }).optional(),
  children: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    dob: Joi.string().required(),
    gender: Joi.string().valid('Male', 'Female').required(),
  })).optional(),
  lands: Joi.array().items(
    Joi.object({
      size: Joi.number().required(),
      latitude: Joi.number().required(),
      longitude: Joi.number().required(),
      ownership: Joi.string().valid("Owned", "Rented", "Borrowed", "Other").required(),
      crops: Joi.array().items(Joi.string()).required(),
      nearby: Joi.array().items(Joi.string().valid("River", "Road", "Lake", "Other")).required(),
      image: Joi.string().optional(),
    })
  ).optional(),
  
});


export const updateFarmerSchema = Joi.object({
  farmer: Joi.object({
    names: Joi.string().min(2).messages({
      "string.empty": "Names cannot be empty",
      "string.min": "Names must be at least 2 characters long",
    }).optional(),
    province: Joi.string().optional(),
    district: Joi.string().optional(),
    sector: Joi.string().optional(),
    cell: Joi.string().optional(),
    village: Joi.string().optional(),
    phones: Joi.array()
    .items(Joi.string().pattern(/^\+250\d{9}$/).messages({
      "string.pattern.base": "Invalid phone number",
    })).optional(),
    dob: Joi.date().iso().optional(),
    gender: Joi.string().valid("Male", "Female").optional(),
  }).optional(),

  partner: Joi.object({
    name: Joi.string().optional(),
    phones: Joi.array()
    .items(Joi.string().pattern(/^\+250\d{9}$/).messages({
      "string.pattern.base": "Invalid phone number",
    })).optional(),
    dob: Joi.date().iso().optional(),
    gender: Joi.string().valid("Male", "Female").optional(),
  }).optional(),

  children: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().optional(),
        dob: Joi.date().iso().optional(),
        gender: Joi.string().valid("Male", "Female").optional(),
      })
    )
    .optional(),

  lands: Joi.array()
    .items(
      Joi.object({
        size: Joi.number().optional(),
        latitude: Joi.number().optional(),
        longitude: Joi.number().optional(),
        ownership: Joi.string()
          .valid("Owned", "Rented", "Borrowed", "Other")
          .optional(),
        crops: Joi.array().items(Joi.string()).optional(),
        nearby: Joi.array()
          .items(Joi.string().valid("River", "Road", "Lake", "Other"))
          .optional(),
        image: Joi.string().optional(),
      })
    )
    .optional(),
});