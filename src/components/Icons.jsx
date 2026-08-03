import React from 'react';

export const Icon = ({ name, size = 16, className = '' }) => <i className={"fas fa-" + name + " " + className} style={{ fontSize: size }}></i>;
export const LayoutDashboard = () => <Icon name="th-large" />;
export const Users = () => <Icon name="users" />;
export const BookOpen = () => <Icon name="book-open" />;
export const CalendarDays = () => <Icon name="calendar-alt" />;
export const CreditCard = () => <Icon name="credit-card" />;
export const Search = () => <Icon name="search" />;
export const Plus = () => <Icon name="plus" />;
export const ArrowLeft = () => <Icon name="arrow-left" />;
export const ChevronRight = () => <Icon name="chevron-right" />;
export const ChevronLeft = () => <Icon name="chevron-left" />;
export const Save = () => <Icon name="save" />;
export const Printer = () => <Icon name="print" />;
export const Trash2 = () => <Icon name="trash-alt" />;
export const Edit = () => <Icon name="edit" />;
export const Clock = () => <Icon name="clock" />;
export const Download = () => <Icon name="download" />;
export const Upload = () => <Icon name="upload" />;
export const Building = () => <Icon name="building" />;
export const UserIcon = ({size=16}) => <Icon name="user" style={{ fontSize: size }} />;
export const LockIcon = () => <Icon name="lock" />;
export const XIcon = ({size=16}) => <Icon name="times" size={size} />;
export const Check = () => <Icon name="check" />;
export const History = () => <Icon name="history" />;

// 애플 스타일 입력폼 및 라벨 클래스 통합
