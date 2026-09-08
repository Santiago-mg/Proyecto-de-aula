import { validate } from '../../../src/interface/middlewares/validate.middleware.ts';
import { describe, it, expect, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import { changeRoleDto } from '../../../src/application/dtos/admin.dto.ts';

class Response {
    statusCode: number = 200
    jsonData: any = null

    status(code: number) {
    	this.statusCode = code;
	return this;
    }

    json(data: any) {
    	this.jsonData = data;
	return this;
    }
}

describe('Parses Zod schemas', () => {
    it('Path 1: Invalid changeRoleDto schema', async () => {
	const req = { body: { role: 'SPY' } };
	const res = new Response(); 
	const next = () => {};

	await validate(changeRoleDto, 'body')(req, res, next);

	expect(res.statusCode).toBe(400);
    });
});
