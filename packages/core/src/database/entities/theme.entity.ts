import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('themes')
export class Theme {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column()
  version: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  author: string;

  @Column({ nullable: true })
  previewUrl: string;

  @Column({ type: 'jsonb', default: {} })
  manifest: {
    layouts?: string[];
    colorSchemes?: Record<string, any>;
    typography?: Record<string, any>;
    components?: string[];
    customizable?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  defaultStyles: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    fontSize?: string;
    borderRadius?: string;
    spacing?: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPaid: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
