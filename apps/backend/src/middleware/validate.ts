import { Request, Response, NextFunction } from "express"
import { ZodType } from "zod"
import { AppError } from "../errors/AppError"

export function validate(schema: ZodType) {
    return (req: Request, _res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            throw new AppError(400, result.error.issues.map(i => i.message).join(", "))
        }
        req.body = result.data
        next()
    }
}