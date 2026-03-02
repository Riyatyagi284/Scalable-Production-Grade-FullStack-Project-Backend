import { Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { TokenService } from "./TokenService";
import { User } from "../entity/User";
import { Config } from "../config";

export class CookieService {
    constructor(private tokenService: TokenService) {}

    async setAuthenticationCookies(user: User, res: Response) {
        const payload: JwtPayload = {
            sub: String(user.id),
            role: user.role,

            tenant: user.tenant ? user.tenant.id : null,

            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        };

        const accessToken = this.tokenService.generateAccessToken(payload);

        const newRefreshToken =
            await this.tokenService.persistRefreshToken(user);

        const refreshToken = this.tokenService.generateRefreshToken({
            ...payload,
            id: String(newRefreshToken.id),
        });

        res.cookie("accessToken", accessToken, {
            domain: Config.MAIN_DOMAIN,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 1, // 1d
            httpOnly: true,
            secure: true,
        });

        res.cookie("refreshToken", refreshToken, {
            domain: Config.MAIN_DOMAIN,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 365, // 1y
            httpOnly: true,
            secure: true,
        });
    }
}
