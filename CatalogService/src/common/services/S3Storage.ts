import {
    DeleteObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import config from "config";
import { FileData, FileStorage } from "../types/storage";
import createHttpError from "http-errors";

export class S3Storage implements FileStorage {
    private client: S3Client;

    constructor() {
        this.client = new S3Client({
            region: config.get<string>("s3.region"),
            credentials: {
                accessKeyId: config.get<string>("s3.accessKeyId"),
                secretAccessKey: config.get<string>("s3.secretAccessKey"),
            },
        });
    }
    async upload(data: FileData): Promise<void> {
        const objectParams = {
            Bucket: config.get<string>("s3.bucket"),
            Key: data.filename,
            Body:
                data.fileData instanceof Buffer
                    ? data.fileData
                    : Buffer.from(data.fileData),
            ContentType: data.contentType,
        };

        await this.client.send(new PutObjectCommand(objectParams));
    }

    async delete(filename: string): Promise<void> {
        const objectParams = {
            Bucket: config.get<string>("s3.bucket"),
            Key: filename,
        };

        await this.client.send(new DeleteObjectCommand(objectParams));
    }
    getObjectUri(filename: string): string {
        const bucket = config.get<string>("s3.bucket");
        const region = config.get<string>("s3.region");

        if (!bucket || !region) {
            throw createHttpError(500, "Invalid S3 configuration");
        }

        return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
    }
}
