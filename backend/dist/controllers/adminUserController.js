"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminUserController = void 0;
const userService_1 = require("../services/userService");
exports.adminUserController = {
    async createUser(req, res) {
        const admin = req.user;
        const result = await userService_1.userService.createUser({ ...req.body, role: req.body?.role });
        res.status(201).json(result);
    },
    async listUsers(req, res) {
        const admin = req.user;
        const result = await userService_1.userService.listUsers(admin.id);
        res.status(200).json(result);
    },
};
