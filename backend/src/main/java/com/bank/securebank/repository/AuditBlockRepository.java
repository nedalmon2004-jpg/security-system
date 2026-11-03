package com.bank.securebank.repository;

import com.bank.securebank.model.AuditBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AuditBlockRepository extends JpaRepository<AuditBlock, Long> {

    Optional<AuditBlock> findTopByOrderByBlockIndexDesc();

    List<AuditBlock> findAllByOrderByBlockIndexAsc();

    List<AuditBlock> findByUserIdAndEventTypeInOrderByBlockIndexDesc(Long userId, List<String> eventTypes);
}
