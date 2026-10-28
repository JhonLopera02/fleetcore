import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  findById(id: number) {
    return this.users.findOne({ where: { id } });
  }

  /** Devuelve el usuario CON su hash (solo para el login). */
  findByEmailWithPassword(email: string) {
    return this.users
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  existsByEmail(email: string) {
    return this.users.exists({ where: { email } });
  }

  create(data: Partial<User>) {
    return this.users.save(this.users.create(data));
  }
}
