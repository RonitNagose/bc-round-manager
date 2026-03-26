"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const authService_1 = require("../services/authService");
const User_1 = require("../models/User");
exports.authController = {
    async login(req, res) {
        const { phone, password } = req.body ?? {};
        const result = await authService_1.authService.login({ phone, password });
        res.status(200).json(result);
    },
    async me(req, res) {
        const authUser = req.user;
        const user = await User_1.User.findById(authUser.id).select("name phone role").exec();
        res.status(200).json({
            user: user
                ? {
                    id: user._id.toString(),
                    name: user.name,
                    phone: user.phone,
                    role: user.role,
                }
                : authUser,
        });
    },
};
