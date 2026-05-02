package com.financetracker.backend.service;

import com.financetracker.backend.dto.SummaryResponse;
import com.financetracker.backend.dto.TransactionRequest;
import com.financetracker.backend.entity.Transaction;
import com.financetracker.backend.entity.TransactionType;
import com.financetracker.backend.entity.User;
import com.financetracker.backend.exception.ResourceNotFoundException;
import com.financetracker.backend.repository.TransactionRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;

    public TransactionService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public List<Transaction> getTransactions(User user, String search, TransactionType type, String category) {
        Specification<Transaction> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("user").get("id"), user.getId()));

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("title")), pattern),
                    criteriaBuilder.like(criteriaBuilder.lower(root.get("category")), pattern)
                ));
            }

            if (type != null) {
                predicates.add(criteriaBuilder.equal(root.get("type"), type));
            }

            if (category != null && !category.isBlank()) {
                predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(root.get("category")), category.trim().toLowerCase()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        return transactionRepository.findAll(specification, Sort.by(Sort.Direction.DESC, "date", "id"));
    }

    public Transaction createTransaction(User user, TransactionRequest request) {
        Transaction transaction = new Transaction();
        applyRequest(transaction, request);
        transaction.setUser(user);
        return transactionRepository.save(transaction);
    }

    public Transaction updateTransaction(User user, Long id, TransactionRequest request) {
        Transaction transaction = getTransactionById(user, id);
        applyRequest(transaction, request);
        return transactionRepository.save(transaction);
    }

    public void deleteTransaction(User user, Long id) {
        Transaction transaction = getTransactionById(user, id);
        transactionRepository.delete(transaction);
    }

    public SummaryResponse getSummary(User user) {
        BigDecimal income = sumByType(user, TransactionType.INCOME);
        BigDecimal expenses = sumByType(user, TransactionType.EXPENSE);
        return new SummaryResponse(income, expenses, income.subtract(expenses));
    }

    public Transaction getTransactionById(User user, Long id) {
        return transactionRepository.findByIdAndUserId(id, user.getId())
            .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id " + id));
    }

    private void applyRequest(Transaction transaction, TransactionRequest request) {
        transaction.setTitle(request.getTitle().trim());
        transaction.setAmount(request.getAmount());
        transaction.setCategory(request.getCategory().trim());
        transaction.setType(request.getType());
        transaction.setDate(request.getDate());
    }

    private BigDecimal sumByType(User user, TransactionType type) {
        return transactionRepository.sumAmountByUserIdAndType(user.getId(), type);
    }
}
