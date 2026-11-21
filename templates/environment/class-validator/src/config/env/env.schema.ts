import { Type } from "class-transformer";
import { IsIn, IsNumber, IsOptional, Max, Min } from "class-validator";

// Add environment variables types here
export class EnvironmentVariables {
  @IsIn(["development", "production", "test"])
  NODE_ENV: "development" | "production" | "test" = "development";

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;
}
