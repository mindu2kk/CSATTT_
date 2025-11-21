import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  BookBorrowed,
  BookReturned,
  LoanExtended,
  BookReserved,
  BookAvailableForReservation,
  PenaltyWithdrawn
} from "../generated/LibraryCore/LibraryCore";
import {
  Loan,
  User,
  Book,
  Reservation,
  DailyStats,
  GlobalStats,
  Event,
  Transaction
} from "../generated/schema";

// Helper function to get or create user
function getOrCreateUser(address: Bytes): User {
  let user = User.load(address.toHexString());
  
  if (user == null) {
    user = new User(address.toHexString());
    user.reputation = BigInt.fromI32(0);
    user.totalBorrows = BigInt.fromI32(0);
    user.totalReturns = BigInt.fromI32(0);
    user.totalPenalties = BigInt.fromI32(0);
    user.createdAt = BigInt.fromI32(0);
    user.lastActiveAt = BigInt.fromI32(0);
    user.onTimeReturnRate = BigInt.fromI32(0).toBigDecimal();
    user.averageLoanDuration = BigInt.fromI32(0);
    user.save();
    
    // Update global stats
    let globalStats = getOrCreateGlobalStats();
    globalStats.totalUsers = globalStats.totalUsers.plus(BigInt.fromI32(1));
    globalStats.save();
  }
  
  return user;
}

// Helper function to get or create global stats
function getOrCreateGlobalStats(): GlobalStats {
  let stats = GlobalStats.load("global");
  
  if (stats == null) {
    stats = new GlobalStats("global");
    stats.totalBooks = BigInt.fromI32(0);
    stats.totalLoans = BigInt.fromI32(0);
    stats.totalUsers = BigInt.fromI32(0);
    stats.totalRevenue = BigInt.fromI32(0);
    stats.availableBooks = BigInt.fromI32(0);
    stats.borrowedBooks = BigInt.fromI32(0);
    stats.activeLoans = BigInt.fromI32(0);
    stats.averageLoanDuration = BigInt.fromI32(0);
    stats.averageRating = BigInt.fromI32(0).toBigDecimal();
    stats.lastUpdated = BigInt.fromI32(0);
    stats.save();
  }
  
  return stats;
}

// Helper function to get or create daily stats
function getOrCreateDailyStats(timestamp: BigInt): DailyStats {
  let dayId = timestamp.div(BigInt.fromI32(86400)).toString();
  let stats = DailyStats.load(dayId);
  
  if (stats == null) {
    stats = new DailyStats(dayId);
    stats.date = timestamp.div(BigInt.fromI32(86400)).times(BigInt.fromI32(86400));
    stats.totalBooks = BigInt.fromI32(0);
    stats.availableBooks = BigInt.fromI32(0);
    stats.borrowedBooks = BigInt.fromI32(0);
    stats.newLoans = BigInt.fromI32(0);
    stats.returnedLoans = BigInt.fromI32(0);
    stats.overdueLoans = BigInt.fromI32(0);
    stats.totalDeposits = BigInt.fromI32(0);
    stats.totalPenalties = BigInt.fromI32(0);
    stats.totalRevenue = BigInt.fromI32(0);
    stats.activeUsers = BigInt.fromI32(0);
    stats.newUsers = BigInt.fromI32(0);
    stats.save();
  }
  
  return stats;
}

export function handleBookBorrowed(event: BookBorrowed): void {
  // Create loan entity
  let loanId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let loan = new Loan(loanId);
  
  loan.book = event.params.tokenId.toString();
  loan.borrower = event.params.borrower.toHexString();
  loan.borrowedAt = event.block.timestamp;
  loan.dueDate = event.params.dueDate;
  loan.deposit = event.params.deposit;
  loan.isReturned = false;
  loan.isOverdue = false;
  loan.isDamaged = false;
  loan.latePenalty = BigInt.fromI32(0);
  loan.damagePenalty = BigInt.fromI32(0);
  loan.totalPenalty = BigInt.fromI32(0);
  loan.reputationChange = BigInt.fromI32(0);
  loan.transactionHash = event.transaction.hash;
  loan.blockNumber = event.block.number;
  loan.blockTimestamp = event.block.timestamp;
  loan.save();
  
  // Update user
  let user = getOrCreateUser(event.params.borrower);
  user.totalBorrows = user.totalBorrows.plus(BigInt.fromI32(1));
  user.lastActiveAt = event.block.timestamp;
  user.save();
  
  // Update book
  let book = Book.load(event.params.tokenId.toString());
  if (book != null) {
    book.borrowCount = book.borrowCount.plus(BigInt.fromI32(1));
    book.updatedAt = event.block.timestamp;
    book.save();
  }
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.newLoans = dailyStats.newLoans.plus(BigInt.fromI32(1));
  dailyStats.totalDeposits = dailyStats.totalDeposits.plus(event.params.deposit);
  dailyStats.save();
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.totalLoans = globalStats.totalLoans.plus(BigInt.fromI32(1));
  globalStats.activeLoans = globalStats.activeLoans.plus(BigInt.fromI32(1));
  globalStats.borrowedBooks = globalStats.borrowedBooks.plus(BigInt.fromI32(1));
  globalStats.availableBooks = globalStats.availableBooks.minus(BigInt.fromI32(1));
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
  
  // Create event
  let eventEntity = new Event(loanId);
  eventEntity.type = "BookBorrowed";
  eventEntity.book = event.params.tokenId.toString();
  eventEntity.user = event.params.borrower.toHexString();
  eventEntity.timestamp = event.block.timestamp;
  eventEntity.blockNumber = event.block.number;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

export function handleBookReturned(event: BookReturned): void {
  // Find the loan
  let loanId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  
  // Update loan (we need to find the original loan, this is simplified)
  // In production, you'd track loan IDs more carefully
  let loan = Loan.load(loanId);
  if (loan == null) {
    loan = new Loan(loanId);
    loan.book = event.params.tokenId.toString();
    loan.borrower = event.params.borrower.toHexString();
    loan.borrowedAt = BigInt.fromI32(0);
    loan.dueDate = BigInt.fromI32(0);
    loan.deposit = BigInt.fromI32(0);
    loan.transactionHash = event.transaction.hash;
    loan.blockNumber = event.block.number;
    loan.blockTimestamp = event.block.timestamp;
  }
  
  loan.returnedAt = event.block.timestamp;
  loan.isReturned = true;
  loan.totalPenalty = event.params.penalty;
  loan.reputationChange = event.params.reputationDelta;
  loan.imageAfterHash = event.params.imageAfterHash;
  
  // Check if overdue
  if (event.block.timestamp.gt(loan.dueDate)) {
    loan.isOverdue = true;
  }
  
  loan.save();
  
  // Update user
  let user = getOrCreateUser(event.params.borrower);
  user.totalReturns = user.totalReturns.plus(BigInt.fromI32(1));
  user.totalPenalties = user.totalPenalties.plus(event.params.penalty);
  user.reputation = user.reputation.plus(event.params.reputationDelta);
  user.lastActiveAt = event.block.timestamp;
  user.save();
  
  // Update book
  let book = Book.load(event.params.tokenId.toString());
  if (book != null) {
    book.totalRevenue = book.totalRevenue.plus(event.params.penalty);
    book.updatedAt = event.block.timestamp;
    book.save();
  }
  
  // Update daily stats
  let dailyStats = getOrCreateDailyStats(event.block.timestamp);
  dailyStats.returnedLoans = dailyStats.returnedLoans.plus(BigInt.fromI32(1));
  dailyStats.totalPenalties = dailyStats.totalPenalties.plus(event.params.penalty);
  dailyStats.totalRevenue = dailyStats.totalRevenue.plus(event.params.penalty);
  dailyStats.save();
  
  // Update global stats
  let globalStats = getOrCreateGlobalStats();
  globalStats.activeLoans = globalStats.activeLoans.minus(BigInt.fromI32(1));
  globalStats.borrowedBooks = globalStats.borrowedBooks.minus(BigInt.fromI32(1));
  globalStats.availableBooks = globalStats.availableBooks.plus(BigInt.fromI32(1));
  globalStats.totalRevenue = globalStats.totalRevenue.plus(event.params.penalty);
  globalStats.lastUpdated = event.block.timestamp;
  globalStats.save();
  
  // Create event
  let eventEntity = new Event(loanId + "-return");
  eventEntity.type = "BookReturned";
  eventEntity.book = event.params.tokenId.toString();
  eventEntity.user = event.params.borrower.toHexString();
  eventEntity.timestamp = event.block.timestamp;
  eventEntity.blockNumber = event.block.number;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

export function handleLoanExtended(event: LoanExtended): void {
  // Create event
  let eventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let eventEntity = new Event(eventId);
  eventEntity.type = "LoanExtended";
  eventEntity.book = event.params.tokenId.toString();
  eventEntity.user = event.params.borrower.toHexString();
  eventEntity.timestamp = event.block.timestamp;
  eventEntity.blockNumber = event.block.number;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

export function handleBookReserved(event: BookReserved): void {
  // Create reservation
  let reservationId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let reservation = new Reservation(reservationId);
  reservation.book = event.params.tokenId.toString();
  reservation.user = event.params.reserver.toHexString();
  reservation.createdAt = event.block.timestamp;
  reservation.status = "Active";
  reservation.transactionHash = event.transaction.hash;
  reservation.save();
  
  // Create event
  let eventEntity = new Event(reservationId);
  eventEntity.type = "BookReserved";
  eventEntity.book = event.params.tokenId.toString();
  eventEntity.user = event.params.reserver.toHexString();
  eventEntity.timestamp = event.block.timestamp;
  eventEntity.blockNumber = event.block.number;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

export function handleBookAvailableForReservation(event: BookAvailableForReservation): void {
  // Update reservation status
  // This is simplified - in production, you'd need to track reservations more carefully
  
  // Create event
  let eventId = event.transaction.hash.toHex() + "-" + event.logIndex.toString();
  let eventEntity = new Event(eventId);
  eventEntity.type = "BookReserved";
  eventEntity.book = event.params.tokenId.toString();
  eventEntity.user = event.params.reserver.toHexString();
  eventEntity.timestamp = event.block.timestamp;
  eventEntity.blockNumber = event.block.number;
  eventEntity.transactionHash = event.transaction.hash;
  eventEntity.save();
}

export function handlePenaltyWithdrawn(event: PenaltyWithdrawn): void {
  // Create transaction
  let txId = event.transaction.hash.toHex();
  let transaction = new Transaction(txId);
  transaction.type = "Withdraw";
  transaction.from = event.params.owner.toHexString();
  transaction.amount = event.params.amount;
  transaction.timestamp = event.block.timestamp;
  transaction.blockNumber = event.block.number;
  transaction.gasUsed = BigInt.fromI32(0); // Would need to get from receipt
  transaction.gasPrice = BigInt.fromI32(0);
  transaction.save();
}
