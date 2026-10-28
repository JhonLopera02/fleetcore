import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Mechanic } from './entities/mechanic.entity';
import { MechanicsController } from './mechanics.controller';
import { MechanicsService } from './mechanics.service';

@Module({
  imports: [TypeOrmModule.forFeature([Mechanic, User])],
  controllers: [MechanicsController],
  providers: [MechanicsService],
  exports: [TypeOrmModule],
})
export class MechanicsModule {}
