import { FastifyReply, FastifyRequest } from "fastify";
import { SpecificationService } from "../services/SpecificationService";
import { SpecificationEntity } from "../../database/migrations/specification.entity";

export class SpecificationController {
  constructor(private service: SpecificationService) {}

  async getAll(req: FastifyRequest, reply: FastifyReply) {
    const specs = await this.service.getAll();
    return reply.status(200).send(specs);
  }

  async create(req: FastifyRequest, reply: FastifyReply) {
    const data = req.body as Partial<SpecificationEntity>;
    const newSpec = await this.service.create(data);
    return reply.status(201).send(newSpec);
  }

  async update(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const data = req.body as Partial<SpecificationEntity>;
    const updatedSpec = await this.service.update(id, data);
    return reply.status(200).send(updatedSpec);
  }

  async delete(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as { id: string };
    const result = await this.service.delete(id);
    return reply.status(200).send(result);
  }
}
