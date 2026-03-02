import {
    Column,
    CreateDateColumn,
    Entity,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@Entity({ name: "tenants" })
export class Tenant {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("varchar", { length: 100 })
    name: string;

    @Column("varchar", { length: 255 })
    address: string;

    @UpdateDateColumn()
    updatedAt: number;

    @CreateDateColumn()
    createdAt: number;

    @OneToMany(() => User, (user) => user.tenant)
    users: User[];
}
