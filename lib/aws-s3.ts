import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

interface S3Config {
  accessKeyId: string
  secretAccessKey: string
  region: string
  bucketName: string
}

const s3Config: S3Config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  region: process.env.AWS_REGION || "test",
  bucketName: process.env.AWS_S3_BUCKET || "test",
}

export class S3Service {
  private s3Client: S3Client
  private config: S3Config
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  constructor() {
    this.config = s3Config
    this.initializeClient()
  }

  private async initializeClient() {
    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.performInitialization()
    return this.initializationPromise
  }

  private async performInitialization() {
    try {
      console.log(`[S3] Initializing AWS S3 client for bucket: ${this.config.bucketName}`)

      this.s3Client = new S3Client({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        maxAttempts: 3,
        retryMode: "adaptive",
      })

      // Test connection
      await this.testConnectionInternal()
      this.isInitialized = true
      console.log(`[S3] AWS S3 client initialized successfully`)
    } catch (error) {
      console.error(`[S3] Failed to initialize S3 client:`, error)
      throw error
    }
  }

  private async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initializeClient()
    }
  }

  private async testConnectionInternal(): Promise<void> {
    const { ListObjectsV2Command } = await import("@aws-sdk/client-s3")
    const command = new ListObjectsV2Command({
      Bucket: this.config.bucketName,
      MaxKeys: 1,
    })

    await this.s3Client.send(command)
  }

  async uploadFile(file: File, key: string, retries = 2): Promise<{ success: boolean; url?: string; error?: string }> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        await this.ensureInitialized()
        console.log(`[S3] Uploading file: ${key} (${file.size} bytes) - attempt ${attempt}`)

        const fileBuffer = Buffer.from(await file.arrayBuffer())

        const command = new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
          Body: fileBuffer,
          ContentType: file.type,
          ContentLength: file.size,
          ServerSideEncryption: "AES256",
          Metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        })

        await this.s3Client.send(command)

        const fileUrl = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${key}`
        console.log(`[S3] Upload successful: ${fileUrl}`)

        return {
          success: true,
          url: fileUrl,
        }
      } catch (error: any) {
        lastError = error
        console.error(`[S3] Upload failed (attempt ${attempt}/${retries + 1}):`, error.message)

        if (attempt <= retries) {
          const delay = Math.min(1000 * attempt, 3000)
          console.log(`[S3] Retrying upload in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Upload failed after all retries",
    }
  }

  async downloadFile(
    key: string,
    retries = 2,
  ): Promise<{ success: boolean; data?: Buffer; error?: string; contentType?: string }> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        await this.ensureInitialized()
        console.log(`[S3] Downloading file from AWS S3: ${key} - attempt ${attempt}`)

        const command = new GetObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
        })

        const response = await this.s3Client.send(command)

        if (!response.Body) {
          throw new Error("No file data received from S3")
        }

        console.log(`[S3] Response received from S3:`)
        console.log(`[S3] - Content Type: ${response.ContentType}`)
        console.log(`[S3] - Content Length: ${response.ContentLength}`)

        // Convert the stream to buffer properly
        const chunks: Uint8Array[] = []

        if (response.Body instanceof ReadableStream) {
          const reader = response.Body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (value) chunks.push(value)
          }
        } else {
          // Handle Node.js stream
          const stream = response.Body as any
          for await (const chunk of stream) {
            chunks.push(chunk)
          }
        }

        const fileBuffer = Buffer.concat(chunks)
        console.log(`[S3] Download successful: ${fileBuffer.length} bytes received`)

        if (fileBuffer.length === 0) {
          throw new Error("Downloaded file is empty")
        }

        return {
          success: true,
          data: fileBuffer,
          contentType: response.ContentType,
        }
      } catch (error: any) {
        lastError = error
        console.error(`[S3] Download failed (attempt ${attempt}/${retries + 1}):`, error.message)

        if (attempt <= retries) {
          const delay = Math.min(1000 * attempt, 3000)
          console.log(`[S3] Retrying download in ${delay}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    return {
      success: false,
      error: `S3 download failed: ${lastError?.message || "Unknown error"}`,
    }
  }

  async deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureInitialized()
      console.log(`[S3] Deleting file: ${key}`)

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      })

      await this.s3Client.send(command)
      console.log(`[S3] Delete successful: ${key}`)
      return { success: true }
    } catch (error: any) {
      console.error("[S3] Delete failed:", error)
      return {
        success: false,
        error: error.message || "Delete failed",
      }
    }
  }

  async generatePresignedUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      await this.ensureInitialized()
      console.log(`[S3] Generating presigned URL for: ${key}`)

      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      })

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn })
      console.log(`[S3] Presigned URL generated successfully`)

      return {
        success: true,
        url: presignedUrl,
      }
    } catch (error: any) {
      console.error("[S3] Presigned URL generation failed:", error)
      return {
        success: false,
        error: error.message || "Failed to generate presigned URL",
      }
    }
  }

  generateUploadKey(userId: number, fileName: string): string {
    const timestamp = Date.now()
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileExtension = sanitizedFileName.split(".").pop()
    const baseName = sanitizedFileName.replace(`.${fileExtension}`, "")

    return `medical-reports/user_${userId}/${timestamp}_${baseName}.${fileExtension}`
  }

  extractKeyFromUrl(url: string): string {
    const urlParts = url.split("/")
    const bucketIndex = urlParts.findIndex((part) => part.includes(this.config.bucketName))
    if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
      return urlParts.slice(bucketIndex + 1).join("/")
    }
    return urlParts.slice(-3).join("/")
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.ensureInitialized()
      console.log("[S3] Testing AWS S3 connection...")

      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3")
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        MaxKeys: 1,
      })

      const result = await this.s3Client.send(command)
      console.log(`[S3] Connection test successful. Found ${result.KeyCount || 0} objects in bucket.`)

      return {
        success: true,
        message: `AWS S3 connected successfully (bucket: ${this.config.bucketName}, objects: ${result.KeyCount || 0})`,
      }
    } catch (error: any) {
      console.error("[S3] Connection test failed:", error)
      return {
        success: false,
        message: `AWS S3 connection failed: ${error.message}`,
      }
    }
  }

  async listFiles(prefix?: string): Promise<{ success: boolean; files?: string[]; error?: string }> {
    try {
      await this.ensureInitialized()
      console.log(`[S3] Listing files with prefix: ${prefix || "all"}`)

      const { ListObjectsV2Command } = await import("@aws-sdk/client-s3")
      const command = new ListObjectsV2Command({
        Bucket: this.config.bucketName,
        Prefix: prefix,
        MaxKeys: 100,
      })

      const result = await this.s3Client.send(command)
      const files = result.Contents?.map((obj) => obj.Key || "") || []

      console.log(`[S3] Found ${files.length} files`)
      return {
        success: true,
        files,
      }
    } catch (error: any) {
      console.error("[S3] List files failed:", error)
      return {
        success: false,
        error: error.message || "Failed to list files",
      }
    }
  }
}

// Create singleton instance and warm it up
export const s3Service = new S3Service()

// Warm up S3 connection on module load
setTimeout(async () => {
  try {
    console.log("[S3] Warming up S3 connection...")
    await s3Service.testConnection()
    console.log("[S3] S3 connection warmed up successfully")
  } catch (error) {
    console.error("[S3] Failed to warm up S3 connection:", error)
  }
}, 200)
